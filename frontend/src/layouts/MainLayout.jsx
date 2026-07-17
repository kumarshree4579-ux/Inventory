import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Badge, Avatar, Collapse, Divider,
  Menu, MenuItem, ListItemAvatar, Tooltip, Popover, CircularProgress,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import UndoIcon from '@mui/icons-material/Undo';
import QrCodeIcon from '@mui/icons-material/QrCode';
import useAuthStore from '../store/authStore';
import { notificationsAPI } from '../api/services';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const DRAWER_WIDTH = 240;
const SIDEBAR_BG = '#0f172a';
const SIDEBAR_TEXT = '#94a3b8';
const SIDEBAR_ACTIVE_BG = 'rgba(99,102,241,0.18)';
const SIDEBAR_ACTIVE_TEXT = '#a5b4fc';
const SIDEBAR_HOVER_BG = 'rgba(255,255,255,0.05)';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/' },
  { label: 'POS Billing', icon: <PointOfSaleIcon fontSize="small" />, path: '/pos' },
  {
    label: 'Inventory', icon: <Inventory2Icon fontSize="small" />, children: [
      { label: 'Products', path: '/products' },
      { label: 'Categories', path: '/categories' },
      { label: 'Brands', path: '/brands' },
      { label: 'Stock', path: '/stock' },
      { label: 'Barcodes', path: '/barcode' },
    ],
  },
  {
    label: 'Purchase', icon: <ShoppingCartIcon fontSize="small" />, children: [
      { label: 'Purchase Orders', path: '/purchase' },
      { label: 'Suppliers', path: '/suppliers' },
    ],
  },
  { label: 'Customers', icon: <PersonIcon fontSize="small" />, path: '/customers' },
  { label: 'Returns', icon: <UndoIcon fontSize="small" />, path: '/returns' },
  { label: 'Expenses', icon: <MoneyOffIcon fontSize="small" />, path: '/expenses' },
  { label: 'Cash Drawer', icon: <AccountBalanceWalletIcon fontSize="small" />, path: '/cash' },
  { label: 'Reports', icon: <AssessmentIcon fontSize="small" />, path: '/reports' },
  {
    label: 'Users', icon: <PeopleIcon fontSize="small" />, children: [
      { label: 'User List', path: '/users' },
      { label: 'Roles', path: '/roles' },
    ],
  },
  {
    label: 'Settings', icon: <SettingsIcon fontSize="small" />, children: [
      { label: 'System Settings', path: '/settings' },
      { label: 'Branches', path: '/branches' },
      { label: 'Counters', path: '/counters' },
      { label: 'Printers', path: '/printers' },
      { label: 'Audit Logs', path: '/audit' },
    ],
  },
];

const sidebarItemSx = {
  borderRadius: 1.5, mx: 1, mb: 0.5, color: SIDEBAR_TEXT,
  '& .MuiListItemIcon-root': { color: SIDEBAR_TEXT, minWidth: 34 },
  '&:hover': { bgcolor: SIDEBAR_HOVER_BG, color: '#e2e8f0' },
  '&.Mui-selected': {
    bgcolor: SIDEBAR_ACTIVE_BG, color: SIDEBAR_ACTIVE_TEXT,
    '& .MuiListItemIcon-root': { color: SIDEBAR_ACTIVE_TEXT },
    '&:hover': { bgcolor: SIDEBAR_ACTIVE_BG },
  },
};

const NavItem = ({ item, navigate, location }) => {
  const isChildActive = item.children?.some(c => location.pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  if (item.children) {
    return (
      <>
        <ListItemButton onClick={() => setOpen(!open)} sx={sidebarItemSx}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }} />
          {open ? <ExpandLess sx={{ fontSize: 16, color: SIDEBAR_TEXT }} /> : <ExpandMore sx={{ fontSize: 16, color: SIDEBAR_TEXT }} />}
        </ListItemButton>
        <Collapse in={open}>
          <List disablePadding>
            {item.children.map(child => (
              <ListItemButton key={child.path} selected={location.pathname === child.path}
                onClick={() => navigate(child.path)} sx={{ ...sidebarItemSx, pl: 5.5 }}>
                <ListItemText primary={child.label} slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </>
    );
  }
  return (
    <ListItemButton selected={location.pathname === item.path} onClick={() => navigate(item.path)} sx={sidebarItemSx}>
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }} />
    </ListItemButton>
  );
};

const TYPE_COLOR = { low_stock: '#f59e0b', new_sale: '#10b981', purchase: '#0ea5e9', system: '#6b7280', return: '#ef4444' };

const NotificationsPanel = ({ anchorEl, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!anchorEl) return;
    setLoading(true);
    notificationsAPI.getAll()
      .then(({ data }) => setNotifications(data || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [anchorEl]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const unread = notifications.filter(n => !n.isRead);

  return (
    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 2, boxShadow: 4, mt: 0.5 } }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
        {unread.length > 0 && <Typography variant="caption" color="text.secondary">{unread.length} unread</Typography>}
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No notifications</Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ overflow: 'auto', maxHeight: 380 }}>
          {notifications.map((n, i) => (
            <Box key={n._id}>
              <ListItemButton onClick={() => !n.isRead && handleMarkRead(n._id)}
                sx={{ px: 2, py: 1.25, bgcolor: n.isRead ? 'transparent' : 'action.hover', alignItems: 'flex-start' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLOR[n.type] || '#6b7280', mt: 0.75, mr: 1.5, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={n.isRead ? 400 : 600} noWrap>{n.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{n.message}</Typography>
                  <Typography variant="caption" color="text.disabled">{dayjs(n.createdAt).fromNow()}</Typography>
                </Box>
              </ListItemButton>
              {i < notifications.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Popover>
  );
};

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    notificationsAPI.getAll()
      .then(({ data }) => setUnreadCount((data || []).filter(n => !n.isRead).length))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: SIDEBAR_BG, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Inventory2Icon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
          Inventory Pro
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 2 }} />
      <List dense sx={{ pt: 1.5, flex: 1, overflow: 'auto' }}>
        {navItems.map(item => <NavItem key={item.label} item={item} navigate={navigate} location={location} />)}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 2 }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f46e5', fontSize: 13, fontWeight: 700 }}>
          {user?.name?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 600 }} noWrap>{user?.name}</Typography>
          <Typography sx={{ color: SIDEBAR_TEXT, fontSize: '0.7rem' }} noWrap>{user?.role?.name}</Typography>
        </Box>
        <Tooltip title="Logout">
          <IconButton size="small" onClick={handleLogout} sx={{ color: SIDEBAR_TEXT, '&:hover': { color: '#ef4444' } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0} sx={{
        zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'background.paper',
        borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary',
        width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` },
      }}>
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ mr: 1 }} onClick={e => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadCount || null} color="error">
                <NotificationsIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Avatar sx={{ width: 32, height: 32, cursor: 'pointer', bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
            onClick={(e) => setAnchorEl(e.currentTarget)}>
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 2, boxShadow: 3 } }}>
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <ListItemAvatar sx={{ mr: 1 }}><AccountCircleIcon color="primary" /></ListItemAvatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.role?.name}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <NotificationsPanel anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} />

      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0, display: { xs: 'none', sm: 'block' },
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
      }}>{drawer}</Drawer>
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '56px', minHeight: '100vh', bgcolor: 'background.default', width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
