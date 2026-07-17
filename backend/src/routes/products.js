const router = require('express').Router();
const XLSX = require('xlsx');
const Product = require('../models/Product');
const { Stock, StockTransaction } = require('../models/Stock');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { protect, can } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const multer = require('multer');
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const NUM_FIELDS = ['purchasePrice', 'sellingPrice', 'mrp', 'gst', 'minStock', 'maxStock', 'openingStock', 'discount'];

const castBody = (body) => {
  NUM_FIELDS.forEach(f => { if (body[f] !== undefined && body[f] !== '') body[f] = +body[f]; });
  if (body.priceIncludesGst !== undefined) body.priceIncludesGst = body.priceIncludesGst === 'true' || body.priceIncludesGst === true;
  return body;
};

router.use(protect);

// ── Autocomplete search (name / SKU / barcode / HSN) ─────────────────────────
// Supports 1L+ records via text index + regex fallback, limit 10
router.get('/search', can('inventory', 'view'), async (req, res, next) => {
  try {
    const { q, field } = req.query;
    if (!q || q.length < 1) return res.json([]);

    let results;

    if (field === 'barcode') {
      // Exact-prefix match on barcode (indexed)
      results = await Product.find({ barcode: new RegExp('^' + q, 'i'), status: 'active' })
        .select('name sku barcode hsn purchasePrice sellingPrice mrp gst unit brand category priceIncludesGst')
        .populate('brand', 'name').populate('category', 'name')
        .limit(10).lean();
    } else if (field === 'sku') {
      results = await Product.find({ sku: new RegExp('^' + q, 'i'), status: 'active' })
        .select('name sku barcode hsn purchasePrice sellingPrice mrp gst unit brand category priceIncludesGst')
        .populate('brand', 'name').populate('category', 'name')
        .limit(10).lean();
    } else if (field === 'hsn') {
      results = await Product.find({ hsn: new RegExp('^' + q, 'i'), status: 'active' })
        .select('name sku barcode hsn purchasePrice sellingPrice mrp gst unit brand category priceIncludesGst')
        .populate('brand', 'name').populate('category', 'name')
        .limit(10).lean();
    } else {
      // name — use $text index for speed on large datasets, fallback to regex
      try {
        results = await Product.find(
          { $text: { $search: q }, status: 'active' },
          { score: { $meta: 'textScore' } }
        )
          .select('name sku barcode hsn purchasePrice sellingPrice mrp gst unit brand category priceIncludesGst')
          .populate('brand', 'name').populate('category', 'name')
          .sort({ score: { $meta: 'textScore' } })
          .limit(10).lean();
      } catch {
        results = await Product.find({ name: new RegExp(q, 'i'), status: 'active' })
          .select('name sku barcode hsn purchasePrice sellingPrice mrp gst unit brand category priceIncludesGst')
          .populate('brand', 'name').populate('category', 'name')
          .limit(10).lean();
      }
    }

    res.json(results);
  } catch (err) { next(err); }
});

// ── Barcode lookup ────────────────────────────────────────────────────────────
router.get('/barcode/:code', can('inventory', 'view'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ barcode: req.params.code })
      .populate('brand', 'name').populate('category', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { next(err); }
});

// ── List with pagination (optimised for 1L+ records) ─────────────────────────
router.get('/', can('inventory', 'view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, category, brand } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (brand) query.brand = brand;

    if (search) {
      // Use $text index when available for performance
      try {
        const [data, total] = await Promise.all([
          Product.find({ $text: { $search: search }, ...query }, { score: { $meta: 'textScore' } })
            .populate('brand', 'name').populate('category', 'name')
            .sort({ score: { $meta: 'textScore' } })
            .skip((page - 1) * limit).limit(+limit).lean(),
          Product.countDocuments({ $text: { $search: search }, ...query }),
        ]);
        return res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
      } catch {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { sku: new RegExp(search, 'i') },
          { barcode: new RegExp(search, 'i') },
        ];
      }
    }

    const [data, total] = await Promise.all([
      Product.find(query).populate('brand', 'name').populate('category', 'name')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      Product.countDocuments(query),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── Get one ───────────────────────────────────────────────────────────────────
router.get('/:id', can('inventory', 'view'), async (req, res, next) => {
  try {
    const doc = await Product.findById(req.params.id)
      .populate('brand', 'name').populate('category', 'name').populate('subcategory', 'name');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

// ── Create with opening stock per branch ─────────────────────────────────────
router.post('/', can('inventory', 'create'), upload.single('image'), async (req, res, next) => {
  try {
    if (req.file) req.body.image = req.file.path;
    castBody(req.body);

    // openingStockBranches: JSON array [{ branch, qty }] for multi-branch opening stock
    // openingStock: single number for user's own branch (backward compat)
    let branchStocks = [];
    if (req.body.openingStockBranches) {
      try { branchStocks = JSON.parse(req.body.openingStockBranches); } catch {}
    }
    // Also include user's own branch if openingStock provided
    const userBranch = req.user.branch?._id?.toString() || req.user.branch?.toString();
    if (userBranch && req.body.openingStock > 0) {
      const exists = branchStocks.find(b => b.branch?.toString() === userBranch);
      if (!exists) branchStocks.push({ branch: userBranch, qty: req.body.openingStock });
    }

    const product = await Product.create(req.body);

    // Create opening stock entries for all specified branches
    if (branchStocks.length) {
      await Promise.all(branchStocks.map(async ({ branch, qty }) => {
        const q = +qty || 0;
        if (!branch || q <= 0) return;
        await Stock.findOneAndUpdate(
          { product: product._id, branch },
          { $inc: { available: q } },
          { upsert: true, new: true }
        );
        await StockTransaction.create({
          product: product._id,
          branch,
          type: 'opening',
          quantity: q,
          note: 'Opening stock',
          performedBy: req.user._id,
        });
      }));
    }

    res.status(201).json(product);
  } catch (err) { next(err); }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', can('inventory', 'edit'), upload.single('image'), async (req, res, next) => {
  try {
    if (req.file) req.body.image = req.file.path;
    castBody(req.body);
    delete req.body.openingStock; // never update opening stock via edit
    const doc = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('brand', 'name').populate('category', 'name');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

// ── Excel Import ─────────────────────────────────────────────────────────────
router.post('/import', can('inventory', 'create'), uploadExcel.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const branchId = req.body.branch || req.user.branch?._id?.toString() || req.user.branch?.toString();
    if (!branchId) return res.status(400).json({ message: 'Branch is required for import' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ message: 'Excel file is empty' });

    // Cache for category/brand lookups to avoid repeated DB hits
    const catCache = {};
    const brandCache = {};

    const resolveCategory = async (name) => {
      if (!name) return undefined;
      const key = name.trim().toLowerCase();
      if (catCache[key]) return catCache[key];
      let doc = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
      if (!doc) doc = await Category.create({ name: name.trim(), status: 'active' });
      catCache[key] = doc._id;
      return doc._id;
    };

    const resolveBrand = async (name) => {
      if (!name) return undefined;
      const key = name.trim().toLowerCase();
      if (brandCache[key]) return brandCache[key];
      let doc = await Brand.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
      if (!doc) doc = await Brand.create({ name: name.trim(), status: 'active' });
      brandCache[key] = doc._id;
      return doc._id;
    };

    const results = { success: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1=header)

      const name = String(row['Name'] || row['name'] || '').trim();
      const sku = String(row['SKU'] || row['sku'] || '').trim().toUpperCase();

      if (!name || !sku) {
        results.errors.push({ row: rowNum, error: 'Name and SKU are required' });
        results.skipped++;
        continue;
      }

      try {
        const categoryId = await resolveCategory(row['Category'] || row['category']);
        const brandId = await resolveBrand(row['Brand'] || row['brand']);

        // Determine branch: row-level branch name/code OR fallback to selected branch
        let targetBranch = branchId;
        const rowBranch = String(row['Branch'] || row['branch'] || '').trim();
        if (rowBranch) {
          const Branch = require('../models/Branch');
          const b = await Branch.findOne({
            $or: [{ name: new RegExp(`^${rowBranch}$`, 'i') }, { code: new RegExp(`^${rowBranch}$`, 'i') }]
          });
          if (b) targetBranch = b._id.toString();
        }

        const openingQty = Math.max(0, +(row['Opening Stock'] || row['openingStock'] || row['opening_stock'] || 0));

        const productData = {
          name,
          sku,
          barcode: String(row['Barcode'] || row['barcode'] || '').trim() || undefined,
          hsn: String(row['HSN'] || row['hsn'] || '').trim() || undefined,
          purchasePrice: +(row['Purchase Price'] || row['purchasePrice'] || 0),
          sellingPrice: +(row['Selling Price'] || row['sellingPrice'] || 0),
          mrp: +(row['MRP'] || row['mrp'] || 0) || undefined,
          gst: +(row['GST%'] || row['gst'] || 0),
          unit: String(row['Unit'] || row['unit'] || 'pcs').trim(),
          minStock: +(row['Min Stock'] || row['minStock'] || 0),
          discount: +(row['Discount%'] || row['discount'] || 0),
          priceIncludesGst: String(row['Price Includes GST'] || '').toLowerCase() === 'yes',
          description: String(row['Description'] || row['description'] || '').trim() || undefined,
          status: 'active',
          category: categoryId,
          brand: brandId,
        };

        // Upsert by SKU
        const product = await Product.findOneAndUpdate(
          { sku: productData.sku },
          { $set: productData },
          { upsert: true, new: true, runValidators: true }
        );

        // Opening stock
        if (openingQty > 0) {
          const existing = await Stock.findOne({ product: product._id, branch: targetBranch });
          if (!existing || existing.available === 0) {
            await Stock.findOneAndUpdate(
              { product: product._id, branch: targetBranch },
              { $inc: { available: openingQty } },
              { upsert: true, new: true }
            );
            await StockTransaction.create({
              product: product._id,
              branch: targetBranch,
              type: 'opening',
              quantity: openingQty,
              note: 'Excel import',
              performedBy: req.user._id,
            });
          }
        }

        results.success++;
      } catch (err) {
        results.errors.push({ row: rowNum, sku, error: err.message });
        results.skipped++;
      }
    }

    res.json({ message: `Import complete: ${results.success} saved, ${results.skipped} skipped`, ...results });
  } catch (err) { next(err); }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', can('inventory', 'delete'), async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
