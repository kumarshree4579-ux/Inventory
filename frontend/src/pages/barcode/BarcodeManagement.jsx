import { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button, Chip,
  InputAdornment, Divider, Alert, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import QrCodeIcon from '@mui/icons-material/QrCode';
import JsBarcode from 'jsbarcode';
import PageHeader from '../../components/common/PageHeader';
import { productsAPI } from '../../api/services';

const FORMATS = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39'];

const LABEL_SIZES = [
  { key: 'small',  label: 'Small (38×25mm)',  w: 38,  barcodeH: 28, fontSize: 5.5 },
  { key: 'medium', label: 'Medium (50×30mm)', w: 50,  barcodeH: 35, fontSize: 6.5 },
  { key: 'large',  label: 'Large (70×40mm)',  w: 70,  barcodeH: 48, fontSize: 7.5 },
  { key: 'xl',     label: 'XL (100×60mm)',    w: 100, barcodeH: 70, fontSize: 9   },
];

// Renders a single barcode SVG and returns its outerHTML
const renderBarcodeSVG = (value, format, barcodeH = 40) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const opts = { format, width: 1.5, height: barcodeH, displayValue: true, fontSize: 10, margin: 3, background: '#ffffff', lineColor: '#000000' };
  try { JsBarcode(svg, value, opts); }
  catch { JsBarcode(svg, value, { ...opts, format: 'CODE128' }); }
  svg.setAttribute('style', 'width:100%;height:auto;display:block;');
  return svg.outerHTML;
};

const BarcodePreview = ({ value, format }) => {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format,
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 6,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      JsBarcode(ref.current, value, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 12, margin: 6 });
    }
  }, [value, format]);

  return <svg ref={ref} />;
};

const BarcodeManagement = () => {
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [printQty, setPrintQty] = useState(1);
  const [format, setFormat] = useState('CODE128');
  const [labelSize, setLabelSize] = useState('medium');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setNotFound(false); setProduct(null);
    try {
      const { data } = await productsAPI.getByBarcode(query.trim());
      setProduct(data);
    } catch {
      // try search by name/SKU
      try {
        const { data } = await productsAPI.getAll({ search: query.trim(), limit: 1 });
        if (data.data?.length) setProduct(data.data[0]);
        else setNotFound(true);
      } catch { setNotFound(true); }
    }
  };

  const barcodeValue = product?.barcode || product?.sku || '';

  const handlePrint = () => {
    if (!product || !barcodeValue) return;
    const size = LABEL_SIZES.find(s => s.key === labelSize) || LABEL_SIZES[1];
    const svgHtml = renderBarcodeSVG(barcodeValue, format, size.barcodeH);
    const fs = size.fontSize;

    const label = `
      <div style="display:inline-flex;flex-direction:column;align-items:center;
        border:1px solid #ccc;padding:2mm 3mm;margin:2mm;
        font-family:Arial,sans-serif;width:${size.w}mm;box-sizing:border-box;
        page-break-inside:avoid;">
        <div style="font-size:${fs}pt;font-weight:700;text-align:center;margin-bottom:1mm;
          width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
          ${product.name}
        </div>
        <div style="width:100%;">${svgHtml}</div>
        <div style="font-size:${fs}pt;font-weight:600;margin-top:1mm;">MRP: ₹${product.mrp || product.sellingPrice}</div>
        ${product.hsn ? `<div style="font-size:${fs - 1}pt;color:#555;">HSN: ${product.hsn}</div>` : ''}
      </div>`;

    const labelsHtml = Array(+printQty).fill(label).join('');

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #fff; }
            .labels { display: flex; flex-wrap: wrap; }
            @media print {
              @page { margin: 5mm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body><div class="labels">${labelsHtml}</div></body>
      </html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };

  return (
    <Box>
      <PageHeader title="Barcode Management" subtitle="Generate, print and scan product barcodes" />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <QrCodeIcon color="primary" />
                <Typography variant="h6">Scan / Search</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth placeholder="Scan barcode, enter SKU or product name..."
                  value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
                />
                <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 90 }}>Search</Button>
              </Box>

              {notFound && <Alert severity="error">No product found for: <strong>{query}</strong></Alert>}

              {product && (
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">SKU: {product.sku}</Typography>
                    </Box>
                    <Chip label={product.status} size="small" color={product.status === 'active' ? 'success' : 'default'} />
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Barcode', value: product.barcode || '—' },
                      { label: 'MRP', value: `₹${product.mrp || product.sellingPrice}` },
                      { label: 'Selling Price', value: `₹${product.sellingPrice}` },
                      { label: 'GST', value: `${product.gst}%` },
                      { label: 'HSN', value: product.hsn || '—' },
                      { label: 'Brand', value: product.brand?.name || '—' },
                    ].map(item => (
                      <Grid key={item.label} size={6}>
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                        <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PrintIcon color="primary" />
                <Typography variant="h6">Print Barcode Labels</Typography>
              </Box>

              {!product ? (
                <Alert severity="info">Search for a product first to print its barcode label.</Alert>
              ) : !barcodeValue ? (
                <Alert severity="warning">This product has no barcode or SKU to print.</Alert>
              ) : (
                <>
                  {/* Live preview */}
                  <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2, textAlign: 'center', bgcolor: '#fff' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>{product.name}</Typography>
                    <BarcodePreview value={barcodeValue} format={format} />
                    <Typography sx={{ fontSize: '0.7rem', mt: 0.5 }}>MRP: ₹{product.mrp || product.sellingPrice}</Typography>
                    {product.hsn && <Typography sx={{ fontSize: '0.65rem', color: '#666' }}>HSN: {product.hsn}</Typography>}
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Barcode Format</InputLabel>
                        <Select value={format} onChange={e => setFormat(e.target.value)} label="Barcode Format">
                          {FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Label Size</InputLabel>
                        <Select value={labelSize} onChange={e => setLabelSize(e.target.value)} label="Label Size">
                          {LABEL_SIZES.map(s => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={6}>
                      <TextField fullWidth size="small" label="Copies" type="number" value={printQty}
                        onChange={e => setPrintQty(Math.max(1, Math.min(100, +e.target.value)))}
                        slotProps={{ htmlInput: { min: 1, max: 100 } }}
                      />
                    </Grid>
                  </Grid>

                  <Button fullWidth variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} size="large">
                    Print {printQty} Label{printQty > 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BarcodeManagement;
