import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, TextField, Button, Typography, Card, IconButton, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Autocomplete, CircularProgress, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Avatar, Tooltip,
  ToggleButtonGroup, ToggleButton, InputAdornment, Paper, Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloseIcon from '@mui/icons-material/Close';
import { productsAPI, salesAPI, customersAPI, branchesAPI, countersAPI, stockAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import { printReceipt } from '../../utils/print';
import toast from 'react-hot-toast';

const CartRow = ({ item, onQty, onRemove, onDiscount }) => {
  const lineTotal = (item.price * item.quantity) - (item.lineDiscount || 0);
  const atMax = item.availableStock !== undefined && item.quantity >= item.availableStock;
  const outOfStock = item.availableStock === 0;
  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: 'action.hover' }, ...(outOfStock && { bgcolor: 'error.50' }) }}>
      <TableCell sx={{ py: 0.75, pl: 1 }}>
        <Typography variant="body2" fontWeight={600}>{item.product.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{item.product.sku}</Typography>
          {item.availableStock !== undefined && (
            <Chip
              label={item.availableStock === 0 ? 'Out of Stock' : `Stock: ${item.availableStock}`}
              size="small"
              color={item.availableStock === 0 ? 'error' : item.availableStock <= 5 ? 'warning' : 'default'}
              sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ py: 0.75, width: 80 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
          <IconButton size="small" onClick={() => onQty(item.product._id, -1)} sx={{ width: 24, height: 24 }}>
            <RemoveIcon sx={{ fontSize: 12 }} />
          </IconButton>
          <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{item.quantity}</Typography>
          <IconButton size="small" onClick={() => onQty(item.product._id, 1)} disabled={atMax} sx={{ width: 24, height: 24 }}>
            <AddIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.75, width: 70 }}>
        <Typography variant="caption" fontWeight={600}>₹{item.price.toFixed(2)}</Typography>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.75, width: 60 }}>
        <TextField size="small" type="number" value={item.lineDiscount || ''}
          onChange={e => onDiscount(item.product._id, +e.target.value || 0)}
          slotProps={{ htmlInput: { min: 0, style: { textAlign: 'right', padding: '2px 4px', fontSize: 11 } } }}
          sx={{ '& .MuiOutlinedInput-root': { fontSize: 11, height: 24 } }} />
      </TableCell>
      <TableCell align="right" sx={{ py: 0.75, width: 70, pr: 1 }}>
        <Typography variant="body2" fontWeight={700} color="primary.main">₹{lineTotal.toFixed(2)}</Typography>
      </TableCell>
      <TableCell align="center" sx={{ py: 0.75, width: 40 }}>
        <IconButton size="small" color="error" onClick={() => onRemove(item.product._id)} sx={{ width: 24, height: 24 }}>
          <DeleteIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

const POSBilling = () => {
  const { user } = useAuthStore();
  const isAdmin = !user?.branch;

  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch?._id || user?.branch || '');
  const [selectedCounter, setSelectedCounter] = useState('');

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const [customer, setCustomer] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneStatus, setPhoneStatus] = useState('idle'); // idle | searching | found | new
  const phoneLookupTimer = useRef(null);
  const [roundingMethod, setRoundingMethod] = useState('round'); // none, round, floor, ceil

  const [payDialog, setPayDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [processing, setProcessing] = useState(false);

  const barcodeRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    branchesAPI.getAll({ limit: 100, status: 'active' }).then(({ data }) => {
      const list = data.data || [];
      setBranches(list);
      if (list.length && !selectedBranch) setSelectedBranch(list[0]._id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    countersAPI.getAll({ branch: selectedBranch, limit: 20 }).then(({ data }) => {
      setCounters(data.data || []);
    }).catch(() => {});
  }, [selectedBranch]);

  useEffect(() => {
    if (!productSearch) { setProductOptions([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setProductLoading(true);
      try {
        const { data } = await productsAPI.search(productSearch, 'name');
        setProductOptions(data || []);
      } catch { setProductOptions([]); }
      finally { setProductLoading(false); }
    }, 250);
  }, [productSearch]);


  const addToCart = useCallback((product) => {
    if (!product) return;
    const gst = product.gst || 0;
    const unitPrice = product.priceIncludesGst
      ? +(product.sellingPrice / (1 + gst / 100)).toFixed(2)
      : product.sellingPrice;
    setCart(prev => {
      const existing = prev.find(i => i.product._id === product._id);
      if (existing) return prev.map(i => i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, price: unitPrice, gst, lineDiscount: 0 }];
    });
    setProductSearch('');
    setProductOptions([]);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  const handleBarcodeKey = async (e) => {
    if (e.key !== 'Enter') return;
    if (!barcodeInput.trim()) return;
    
    try {
      const { data } = await productsAPI.getByBarcode(barcodeInput.trim());
      if (data && data._id) {
        addToCart(data);
        setBarcodeInput('');
      } else {
        toast.error('No product found for this barcode');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Barcode not found');
    }
  };

  const handleAddBarcode = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      const { data } = await productsAPI.getByBarcode(barcodeInput.trim());
      if (data && data._id) {
        addToCart(data);
        setBarcodeInput('');
      } else {
        toast.error('No product found for this barcode');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Barcode not found');
    }
  };

  const updateQty = (id, delta) =>
    setCart(prev => prev.map(i => i.product._id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  const removeItem = (id) => setCart(prev => prev.filter(i => i.product._id !== id));
  const setLineDiscount = (id, val) =>
    setCart(prev => prev.map(i => i.product._id === id ? { ...i, lineDiscount: val } : i));
  const clearCart = () => { setCart([]); setDiscount(''); setCustomer(null); setPhoneInput(''); setNameInput(''); setPhoneStatus('idle'); };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = cart.reduce((s, i) => s + (i.price * i.quantity * (i.gst / 100)), 0);
  const lineDiscounts = cart.reduce((s, i) => s + (i.lineDiscount || 0), 0);
  const billDiscount = +discount || 0;
  let total = Math.max(0, subtotal + taxAmount - lineDiscounts - billDiscount);
  
  // Apply rounding
  const originalTotal = total;
  if (roundingMethod === 'round') total = Math.round(total);
  else if (roundingMethod === 'floor') total = Math.floor(total);
  else if (roundingMethod === 'ceil') total = Math.ceil(total);
  
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const change = Math.max(0, (+cashReceived || 0) - total);

  const handleCheckout = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (!selectedBranch) return toast.error('Select a branch first');
    setProcessing(true);
    try {
      // Auto-save customer if phone+name filled
      let resolvedCustomer = customer;
      if (phoneInput.trim() && nameInput.trim()) {
        try {
          if (phoneStatus === 'found' && customer) {
            if (nameInput.trim() !== customer.name) {
              const { data } = await customersAPI.update(customer._id, { name: nameInput.trim() });
              resolvedCustomer = data;
            }
          } else if (phoneStatus === 'new') {
            const { data } = await customersAPI.create({ phone: phoneInput.trim(), name: nameInput.trim() });
            resolvedCustomer = data;
          }
        } catch { /* non-fatal */ }
      }
      const { data: sale } = await salesAPI.create({
        items: cart.map(i => ({
          product: i.product._id,
          quantity: i.quantity,
          price: i.price,
          gst: i.gst,
          discount: i.lineDiscount || 0,
          total: +(i.price * i.quantity - (i.lineDiscount || 0)).toFixed(2),
        })),
        customer: resolvedCustomer?._id,
        paymentMethod,
        paymentDetails: paymentMethod === 'split' ? { cash: +cashReceived || 0, upi: +splitUpi || 0 } : undefined,
        discountAmount: billDiscount,
        branch: selectedBranch,
        counter: selectedCounter || undefined,
        roundingMethod,
        originalTotal,
      });
      toast.success(`Sale ₹${sale.total.toFixed(2)} — Bill# ${sale.billNumber}`);
      printReceipt(sale);
      clearCart();
      setPayDialog(false);
      setCashReceived('');
      setSplitUpi('');
      barcodeRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally { setProcessing(false); }
  };

  // Phone lookup debounce
  const handlePhoneChange = (val) => {
    setPhoneInput(val);
    setNameInput('');
    setPhoneStatus('idle');
    setCustomer(null);
    clearTimeout(phoneLookupTimer.current);
    if (val.trim().length < 10) return;
    setPhoneStatus('searching');
    phoneLookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await customersAPI.byPhone(val.trim());
        setNameInput(data.name);
        setPhoneStatus('found');
        setCustomer(data); // store ref but don't hide the form
      } catch {
        setPhoneStatus('new');
      }
    }, 400);
  };

  const handleCustomerSave = async () => {
    // kept for potential future use — auto-called during checkout
  };

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const handler = (e) => {
      // F-keys (Windows/Linux) or Cmd+1/2/3 (Mac)
      const macScan   = isMac && e.metaKey && e.key === '1';
      const macSearch = isMac && e.metaKey && e.key === '2';
      const macPay    = isMac && e.metaKey && e.key === '3';
      if (e.key === 'F1' || macScan)   { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === 'F2' || macSearch) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F3' || macPay)    { e.preventDefault(); if (cart.length) setPayDialog(true); }
      if (e.key === 'Escape') setPayDialog(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f5f5f5' }}>

      {/* ── Header bar ── */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" sx={{ fontSize: 24 }} />
          POS Billing
        </Typography>

        {isAdmin && (
          <>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Branch</InputLabel>
              <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} label="Branch">
                {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Counter</InputLabel>
              <Select value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} label="Counter">
                <MenuItem value=""><em>No counter</em></MenuItem>
                {counters.map(c => <MenuItem key={c._id} value={c._id}>{c.name || `Counter ${c.number}`}</MenuItem>)}
              </Select>
            </FormControl>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {(() => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            return [['F1','⌘1','Scan'],['F2','⌘2','Search'],['F3','⌘3','Pay']].map(([fk, mk, l]) => (
              <Chip key={fk} label={`${isMac ? mk : fk} ${l}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 24 }} />
            ));
          })()}
        </Box>
      </Box>

      {/* ── Main split layout (Shopify/Square style: 70/30) ── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 1.5, p: 1.5 }}>

        {/* ── LEFT: Cart (70%) ── */}
        <Box sx={{ flex: '1.75', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search inputs */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', flex: 1, gap: 0.5, alignItems: 'center' }}>
              <TextField
                inputRef={barcodeRef}
                size="small"
                placeholder="Scan barcode (F1)"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKey}
                autoFocus
                sx={{ flex: 1 }}
                slotProps={{ input: {
                  startAdornment: <InputAdornment position="start"><QrCodeScannerIcon sx={{ fontSize: 18 }} /></InputAdornment>,
                } }}
              />
              {barcodeInput && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddBarcode}
                  sx={{ px: 2, height: 40, flexShrink: 0 }}
                >
                  Add
                </Button>
              )}
            </Box>
            <Autocomplete
              size="small"
              sx={{ flex: 1.2 }}
              options={productOptions}
              getOptionLabel={o => o.name || ''}
              loading={productLoading}
              inputValue={productSearch}
              onInputChange={(_, v) => setProductSearch(v)}
              onChange={(_, v) => v && addToCart(v)}
              filterOptions={x => x}
              renderOption={(props, o) => (
                <Box component="li" {...props} key={o._id} sx={{ py: 0.5 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{o.sku} · ₹{o.sellingPrice}</Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search product (F2)"
                  inputRef={searchRef}
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps?.input,
                      ref: params.InputProps?.ref,
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
                      endAdornment: productLoading ? <CircularProgress size={14} /> : params.slotProps?.input?.endAdornment,
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Cart table */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 1.5, minHeight: 0 }}>
            {cart.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%', color: 'text.disabled' }}>
                <ShoppingCartIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2">Scan or search to add items</Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.paper' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Product</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11, width: 80 }}>Qty</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, width: 70 }}>Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, width: 60 }}>Disc</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, width: 70 }}>Total</TableCell>
                        <TableCell sx={{ width: 40 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cart.map(item => (
                        <CartRow key={item.product._id} item={item}
                          onQty={updateQty} onRemove={removeItem} onDiscount={setLineDiscount} />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary">{totalItems} item(s)</Typography>
                  <Tooltip title="Clear cart">
                    <IconButton size="small" color="error" onClick={clearCart} sx={{ width: 28, height: 28 }}>
                      <ClearAllIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            )}
          </Card>
        </Box>

        {/* ── RIGHT: Summary + Payment (30%) ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 280, maxWidth: 340 }}>
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 1.5 }}>

            {/* Scrollable content */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>

              {/* Customer section */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>CUSTOMER</Typography>
                {customer && phoneStatus === 'idle' ? (
                  // Confirmed customer card
                  <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: 'primary.main' }}>{customer.name[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} fontSize={12}>{customer.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => { setCustomer(null); setPhoneInput(''); setNameInput(''); setPhoneStatus('idle'); }} sx={{ width: 22, height: 22 }}>
                      <CloseIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                    <TextField
                      size="small" placeholder="Phone number" value={phoneInput}
                      onChange={e => handlePhoneChange(e.target.value)}
                      slotProps={{ htmlInput: { maxLength: 15 }, input: {
                        endAdornment: phoneStatus === 'searching'
                          ? <InputAdornment position="end"><CircularProgress size={12} /></InputAdornment>
                          : phoneStatus === 'found'
                            ? <InputAdornment position="end"><Chip label="Found" size="small" color="success" sx={{ height: 18, fontSize: 10 }} /></InputAdornment>
                            : phoneStatus === 'new'
                              ? <InputAdornment position="end"><Chip label="New" size="small" color="warning" sx={{ height: 18, fontSize: 10 }} /></InputAdornment>
                              : null
                      } }}
                      sx={{ '& input': { fontSize: 12, py: '6px' } }}
                    />
                    {(phoneStatus === 'found' || phoneStatus === 'new') && (
                      <TextField
                        size="small"
                        placeholder={phoneStatus === 'new' ? 'Enter customer name' : 'Update name'}
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        autoFocus
                        helperText={phoneStatus === 'found' ? 'Existing customer — edit name to update' : 'New customer — will be saved on checkout'}
                        FormHelperTextProps={{ sx: { fontSize: 10, mx: 0 } }}
                        sx={{ '& input': { fontSize: 12, py: '6px' } }}
                      />
                    )}
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Rounding */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>ROUNDING</Typography>
                <ToggleButtonGroup value={roundingMethod} exclusive
                  onChange={(_, v) => v && setRoundingMethod(v)}
                  size="small" fullWidth sx={{ '& .MuiToggleButton-root': { fontSize: 10, py: 0.4, textTransform: 'capitalize' } }}>
                  {[['none','No Round'],['round','Round'],['floor','Floor'],['ceil','Ceil']].map(([v, l]) => (
                    <ToggleButton key={v} value={v} sx={{ flex: 1 }}>{l}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Divider />

              {/* Bill breakdown */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                  <Typography variant="caption" fontWeight={600}>₹{subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Tax (GST)</Typography>
                  <Typography variant="caption" fontWeight={600}>₹{taxAmount.toFixed(2)}</Typography>
                </Box>
                {lineDiscounts > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Item Disc</Typography>
                    <Typography variant="caption" fontWeight={600} color="success.main">-₹{lineDiscounts.toFixed(2)}</Typography>
                  </Box>
                )}
                {roundingMethod !== 'none' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Rounding</Typography>
                    <Typography variant="caption" fontWeight={600} color={total - originalTotal >= 0 ? 'success.main' : 'error.main'}>
                      {total - originalTotal >= 0 ? '+' : ''}₹{(total - originalTotal).toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocalOfferIcon sx={{ fontSize: 11 }} /> Bill Disc
                  </Typography>
                  <TextField size="small" type="number" value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, style: { textAlign: 'right', padding: '2px 4px', fontSize: 11 } }, input: { startAdornment: <InputAdornment position="start" sx={{ mr: 0 }}>₹</InputAdornment> } }}
                    sx={{ width: 80, '& .MuiOutlinedInput-root': { fontSize: 11, height: 26 } }} />
                </Box>
              </Box>

              <Divider />

              {/* Total */}
              <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 1.5, py: 1, borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="inherit" sx={{ opacity: 0.9 }}>TOTAL</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1 }}>₹{total.toFixed(2)}</Typography>
                {roundingMethod !== 'none' && (
                  <Typography variant="caption" color="inherit" sx={{ opacity: 0.75 }}>(rounded)</Typography>
                )}
              </Box>

              {/* Payment method */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>PAYMENT</Typography>
                <ToggleButtonGroup value={paymentMethod} exclusive
                  onChange={(_, v) => v && setPaymentMethod(v)}
                  size="small" fullWidth sx={{ '& .MuiToggleButton-root': { fontSize: 10, py: 0.4, textTransform: 'capitalize' } }}>
                  {['cash', 'upi', 'card', 'credit', 'split'].map(m => (
                    <ToggleButton key={m} value={m} sx={{ flex: 1 }}>{m}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {paymentMethod === 'cash' && (
                <TextField size="small" label="Cash Received" type="number"
                  value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                  helperText={cashReceived ? `Return Cash: ₹${change.toFixed(2)}` : ''}
                  fullWidth />
              )}
            </Box>

            {/* Checkout button - always visible, pinned at bottom */}
            <Box sx={{ p: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
              <Button fullWidth variant="contained" size="large"
                disabled={!cart.length || !selectedBranch || processing}
                onClick={() => setPayDialog(true)}
                startIcon={<PaymentsIcon />}
                sx={{ py: 1.25, fontWeight: 700, borderRadius: 1 }}>
                {processing ? <CircularProgress size={18} color="inherit" /> : 'Checkout (F3)'}
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* ── Payment Dialog ── */}
      <Dialog open={payDialog} onClose={() => !processing && setPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentsIcon color="primary" /> Confirm Payment
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Items</Typography>
              <Typography variant="body2">{totalItems}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">₹{subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Tax</Typography>
              <Typography variant="body2">₹{taxAmount.toFixed(2)}</Typography>
            </Box>
            {(lineDiscounts + billDiscount) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Discount</Typography>
                <Typography variant="body2" color="success.main">-₹{(lineDiscounts + billDiscount).toFixed(2)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight={700}>Total</Typography>
              <Typography fontWeight={800} color="primary.main" fontSize="1.1rem">₹{total.toFixed(2)}</Typography>
            </Box>
          </Paper>

          {customer && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'secondary.main' }}>
                {customer.name[0]}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
                <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
              </Box>
            </Box>
          )}

          <ToggleButtonGroup value={paymentMethod} exclusive
            onChange={(_, v) => v && setPaymentMethod(v)}
            size="small" fullWidth>
            {['cash', 'upi', 'card', 'credit', 'split'].map(m => (
              <ToggleButton key={m} value={m} sx={{ textTransform: 'capitalize', fontSize: 12, flex: 1 }}>{m}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          {(paymentMethod === 'cash' || paymentMethod === 'split') && (
            <TextField size="small" label="Cash Received" type="number"
              value={cashReceived} onChange={e => setCashReceived(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
              autoFocus fullWidth />
          )}
          {paymentMethod === 'split' && (
            <TextField size="small" label="UPI Amount" type="number"
              value={splitUpi} onChange={e => setSplitUpi(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
              fullWidth />
          )}
          {paymentMethod === 'cash' && cashReceived && (
            <Alert severity={change >= 0 ? 'success' : 'error'} sx={{ py: 0.5 }}>
              {change >= 0 ? `Return Cash: ₹${change.toFixed(2)}` : `Short: ₹${Math.abs(change).toFixed(2)}`}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setPayDialog(false)} variant="outlined" disabled={processing}>Cancel</Button>
          <Button variant="contained" size="large" onClick={handleCheckout} disabled={processing ||
            (paymentMethod === 'cash' && cashReceived !== '' && +cashReceived < total)}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <ReceiptIcon />}
            sx={{ flex: 1 }}>
            {processing ? 'Processing...' : 'Complete & Print'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POSBilling;