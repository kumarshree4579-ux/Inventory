import { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, TextField, Button, Typography, Card, CardContent,
  List, ListItem, ListItemText, IconButton, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButtonGroup, ToggleButton, FormControl, InputLabel,
  Select, MenuItem, Autocomplete, CircularProgress, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { productsAPI, salesAPI, customersAPI, branchesAPI, countersAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const POSBilling = () => {
  const { user } = useAuthStore();
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [payDialog, setPayDialog] = useState(false);
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch?._id || user?.branch || '');
  const [selectedCounter, setSelectedCounter] = useState(user?.counter?._id || user?.counter || '');
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const searchTimer = useRef(null);
  const barcodeRef = useRef(null);

  const isAdmin = !user?.branch;

  useEffect(() => {
    if (isAdmin) {
      branchesAPI.getAll({ limit: 100, status: 'active' }).then(({ data }) => {
        setBranches(data.data || []);
        if (data.data?.length && !selectedBranch) setSelectedBranch(data.data[0]._id);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    countersAPI.getAll({ branch: selectedBranch, limit: 20 }).then(({ data }) => {
      setCounters(data.data || []);
    }).catch(() => {});
  }, [selectedBranch]);

  // Product search with debounce
  useEffect(() => {
    if (!productSearch || productSearch.length < 1) { setProductOptions([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setProductLoading(true);
      try {
        const { data } = await productsAPI.search(productSearch, 'name');
        setProductOptions(data);
      } catch { setProductOptions([]); }
      finally { setProductLoading(false); }
    }, 300);
  }, [productSearch]);

  // Customer search
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) return;
    customersAPI.getAll({ search: customerSearch, limit: 10 })
      .then(({ data }) => setCustomerOptions(data.data || []))
      .catch(() => {});
  }, [customerSearch]);

  const addToCart = (product) => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(i => i.product._id === product._id);
      if (existing) {
        return prev.map(i => i.product._id === product._id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        price: product.sellingPrice,
        gst: product.gst || 0,
        discount: 0,
        total: product.sellingPrice,
      }];
    });
    setProductSearch('');
    setProductOptions([]);
    barcodeRef.current?.focus();
  };

  const handleBarcodeEnter = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    try {
      const { data } = await productsAPI.getByBarcode(barcodeInput.trim());
      addToCart(data);
      setBarcodeInput('');
    } catch {
      toast.error('Product not found for barcode: ' + barcodeInput);
    }
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.product._id === id
        ? { ...i, quantity: Math.max(1, i.quantity + delta), total: Math.max(1, i.quantity + delta) * i.price }
        : i
      )
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.product._id !== id));

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const taxAmount = cart.reduce((s, i) => s + (i.total * ((i.gst || 0) / 100)), 0);
  const total = Math.max(0, subtotal + taxAmount - (+discount || 0));

  const handleCheckout = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (!selectedBranch) return toast.error('Select a branch');
    try {
      await salesAPI.create({
        items: cart.map(i => ({
          product: i.product._id,
          quantity: i.quantity,
          price: i.price,
          gst: i.gst,
          discount: i.discount,
          total: i.total,
        })),
        customer: customer?._id,
        paymentMethod,
        discountAmount: +discount || 0,
        branch: selectedBranch,
        counter: selectedCounter || undefined,
      });
      toast.success('Sale completed!');
      setCart([]);
      setDiscount(0);
      setCustomer(null);
      setPayDialog(false);
      barcodeRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>POS Billing</Typography>

      {/* Branch/Counter selector for admin */}
      {isAdmin && (
        <Box display="flex" gap={2} mb={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Branch</InputLabel>
            <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} label="Branch">
              {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Counter</InputLabel>
            <Select value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} label="Counter">
              <MenuItem value=""><em>No counter</em></MenuItem>
              {counters.map(c => <MenuItem key={c._id} value={c._id}>Counter {c.number} - {c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      )}

      <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Left: Search + Cart */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  inputRef={barcodeRef}
                  size="small" placeholder="Scan barcode → Enter"
                  value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeEnter}
                  sx={{ flex: 1 }} autoFocus
                />
              </Box>
              {/* Product name search */}
              <Autocomplete
                size="small"
                options={productOptions}
                getOptionLabel={o => o.name || ''}
                loading={productLoading}
                inputValue={productSearch}
                onInputChange={(_, v) => setProductSearch(v)}
                onChange={(_, v) => v && addToCart(v)}
                filterOptions={x => x}
                renderOption={(props, o) => (
                  <Box component="li" {...props} key={o._id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {o.sku} | ₹{o.sellingPrice} | GST: {o.gst}%
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search product by name..."
                    InputProps={{ ...params.InputProps, endAdornment: productLoading ? <CircularProgress size={16} /> : null }}
                  />
                )}
              />
            </CardContent>
            <Divider />
            <CardContent sx={{ flex: 1, overflow: 'auto', py: 1 }}>
              {cart.length === 0 ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography color="text.secondary">Scan or search products to add to cart</Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {cart.map(item => (
                    <ListItem
                      key={item.product._id} divider
                      secondaryAction={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <IconButton size="small" onClick={() => updateQty(item.product._id, -1)}><RemoveIcon fontSize="small" /></IconButton>
                          <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQty(item.product._id, 1)}><AddIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => removeItem(item.product._id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={item.product.name}
                        secondary={`₹${item.price} × ${item.quantity} = ₹${item.total.toFixed(2)}${item.gst ? ` (+${item.gst}% GST)` : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Summary */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6" mb={2}>Order Summary</Typography>

              {/* Customer */}
              <Autocomplete
                size="small" sx={{ mb: 2 }}
                options={customerOptions}
                getOptionLabel={o => `${o.name} (${o.phone})`}
                value={customer}
                onChange={(_, v) => setCustomer(v)}
                onInputChange={(_, v) => setCustomerSearch(v)}
                filterOptions={x => x}
                renderInput={(params) => <TextField {...params} label="Customer (optional)" />}
              />

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Items</Typography>
                <Typography>{cart.reduce((s, i) => s + i.quantity, 0)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Tax</Typography>
                <Typography>₹{taxAmount.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                <Typography color="text.secondary">Discount</Typography>
                <TextField size="small" type="number" value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  sx={{ width: 100 }} inputProps={{ min: 0 }} />
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" color="primary" fontWeight={700}>₹{total.toFixed(2)}</Typography>
              </Box>

              <Typography variant="body2" mb={1} fontWeight={500}>Payment Method</Typography>
              <ToggleButtonGroup
                value={paymentMethod} exclusive
                onChange={(_, v) => v && setPaymentMethod(v)}
                size="small" fullWidth sx={{ mb: 2 }}
              >
                {['cash', 'upi', 'card', 'credit'].map(m => (
                  <ToggleButton key={m} value={m} sx={{ textTransform: 'capitalize', flex: 1 }}>{m}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </CardContent>
            <CardContent sx={{ pt: 0 }}>
              <Button
                fullWidth variant="contained" size="large"
                onClick={() => setPayDialog(true)}
                disabled={!cart.length || !selectedBranch}
              >
                Checkout — ₹{total.toFixed(2)}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={payDialog} onClose={() => setPayDialog(false)}>
        <DialogTitle>Confirm Payment</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Items:</Typography>
            <Typography>{cart.reduce((s, i) => s + i.quantity, 0)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Total:</Typography>
            <Typography fontWeight={700}>₹{total.toFixed(2)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography>Method:</Typography>
            <Chip label={paymentMethod} size="small" color="primary" />
          </Box>
          {customer && (
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography>Customer:</Typography>
              <Typography>{customer.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCheckout}>Confirm & Complete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POSBilling;
