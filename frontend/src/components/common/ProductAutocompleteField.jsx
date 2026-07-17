import { useRef, useState } from 'react';
import {
  Box, TextField, Paper, List, ListItemButton, ListItemText,
  Typography, Chip, CircularProgress, ClickAwayListener,
} from '@mui/material';
import useProductSearch from '../../hooks/useProductSearch';

/**
 * Smart product field with autocomplete dropdown.
 * Props:
 *   label, field ('name'|'sku'|'barcode'|'hsn'), value, onChange, onSelect, ...textFieldProps
 * onSelect(product) — called when user picks a suggestion
 */
const ProductAutocompleteField = ({ label, field = 'name', value, onChange, onSelect, ...rest }) => {
  const { query, setQuery, results, setResults, loading } = useProductSearch(field);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    setQuery(v);
    setOpen(true);
  };

  const handleSelect = (product) => {
    setOpen(false);
    setResults([]);
    setQuery('');
    onSelect(product);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          {...rest}
          label={label}
          value={value}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          inputRef={inputRef}
          InputProps={{
            endAdornment: loading ? <CircularProgress size={16} /> : null,
          }}
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1400,
              maxHeight: 320, overflow: 'auto', mt: 0.5,
            }}
          >
            <List dense disablePadding>
              {results.map((p) => (
                <ListItemButton
                  key={p._id}
                  onClick={() => handleSelect(p)}
                  divider
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                        <Chip label={p.sku} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        {p.barcode && <Chip label={p.barcode} size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={1.5} mt={0.3}>
                        <Typography variant="caption">₹{p.sellingPrice}</Typography>
                        {p.gst > 0 && <Typography variant="caption" color="text.secondary">GST {p.gst}%</Typography>}
                        {p.category?.name && <Typography variant="caption" color="text.secondary">{p.category.name}</Typography>}
                        {p.brand?.name && <Typography variant="caption" color="text.secondary">{p.brand.name}</Typography>}
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default ProductAutocompleteField;
