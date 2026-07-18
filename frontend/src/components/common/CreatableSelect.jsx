import { useState, useEffect, useRef } from 'react';
import {
  Box, TextField, Paper, List, ListItemButton, ListItemText,
  Typography, CircularProgress, ClickAwayListener, Chip, Divider,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';

/**
 * CreatableSelect
 * Props:
 *   label          - field label
 *   value          - current selected id
 *   onChange(id, displayValue)   - called with selected _id and optional display name (or null)
 *   fetchOptions(q)- async fn returning [{_id, name, ...}]
 *   onCreate(name) - async fn that creates and returns {_id, name}
 *   displayValue   - current display name (for showing selected label)
 *   size           - 'small' | 'medium'
 *   fullWidth
 */
const CreatableSelect = ({
  label, value, onChange, fetchOptions, onCreate,
  displayValue = '', size = 'small', fullWidth = true, placeholder,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef(null);
  const didMount = useRef(false);

  // When a value is selected, show its name in the input
  useEffect(() => {
    if (!open) setInputVal(displayValue || '');
  }, [displayValue, open]);

  const search = (q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchOptions(q);
        setOptions(results);
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 250);
  };

  const handleFocus = () => {
    setInputVal('');
    setOpen(true);
    search('');
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInputVal(v);
    search(v);
  };

  const handleSelect = (opt) => {
    onChange(opt._id, opt.name);
    setInputVal(opt.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setInputVal('');
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = inputVal.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      onChange(created._id, created.name);
      setInputVal(created.name);
      setOpen(false);
    } catch (err) {
      // bubble up — parent handles toast
    } finally { setCreating(false); }
  };

  const exactMatch = options.some(o => o.name.toLowerCase() === inputVal.trim().toLowerCase());
  const showCreate = inputVal.trim().length > 0 && !exactMatch;

  return (
    <ClickAwayListener onClickAway={() => { setOpen(false); setInputVal(displayValue || ''); }}>
      <Box sx={{ position: 'relative', width: fullWidth ? '100%' : undefined }}>
        <TextField
          fullWidth={fullWidth}
          size={size}
          label={label}
          placeholder={placeholder}
          value={inputVal}
          onChange={handleChange}
          onFocus={handleFocus}
          autoComplete="off"
          InputProps={{
            endAdornment: loading || creating
              ? <CircularProgress size={16} />
              : value
                ? (
                  <Typography
                    variant="caption" color="text.secondary"
                    sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={handleClear}
                  >✕</Typography>
                )
                : null,
          }}
        />

        {open && (
          <Paper
            elevation={8}
            sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1400, maxHeight: 260, overflow: 'auto', mt: 0.5 }}
          >
            <List dense disablePadding>
              {options.length === 0 && !showCreate && (
                <ListItemButton disabled>
                  <ListItemText primary={<Typography variant="body2" color="text.secondary">No results</Typography>} />
                </ListItemButton>
              )}
              {options.map(opt => (
                <ListItemButton key={opt._id} onClick={() => handleSelect(opt)} divider>
                  <ListItemText
                    primary={opt.name}
                    secondary={opt.parent?.name ? `Sub of: ${opt.parent.name}` : undefined}
                  />
                  {opt.status === 'inactive' && <Chip label="inactive" size="small" sx={{ ml: 1 }} />}
                </ListItemButton>
              ))}
              {showCreate && (
                <>
                  {options.length > 0 && <Divider />}
                  <ListItemButton onClick={handleCreate} sx={{ color: 'primary.main' }}>
                    <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="primary" fontWeight={600}>
                          Create "{inputVal.trim()}"
                        </Typography>
                      }
                    />
                    {creating && <CircularProgress size={14} sx={{ ml: 1 }} />}
                  </ListItemButton>
                </>
              )}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default CreatableSelect;
