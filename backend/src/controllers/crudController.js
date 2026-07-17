const createCRUD = (Model, populateFields = '') => ({
  getAll: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const query = {};
      if (status) query.status = status;
      if (search) {
        const searchFields = Object.keys(Model.schema.paths).filter(
          f => Model.schema.paths[f].instance === 'String' && !['_id', '__v'].includes(f)
        );
        if (searchFields.length) query.$or = searchFields.map(f => ({ [f]: new RegExp(search, 'i') }));
      }
      const [data, total] = await Promise.all([
        Model.find(query).populate(populateFields).skip((page - 1) * limit).limit(+limit).sort({ createdAt: -1 }),
        Model.countDocuments(query),
      ]);
      res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
  },

  getOne: async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id).populate(populateFields);
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  },

  remove: async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  },
});

module.exports = createCRUD;
