import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import theme from './theme';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Products from './pages/products/Products';
import Categories from './pages/products/Categories';
import Brands from './pages/products/Brands';
import Stock from './pages/stock/Stock';
import BarcodeManagement from './pages/barcode/BarcodeManagement';
import POSBilling from './pages/pos/POSBilling';
import Purchase from './pages/purchase/Purchase';
import Suppliers from './pages/purchase/Suppliers';
import Customers from './pages/customers/Customers';
import Returns from './pages/returns/Returns';
import Expenses from './pages/expenses/Expenses';
import CashManagement from './pages/cash/CashManagement';
import Reports from './pages/reports/Reports';
import Users from './pages/users/Users';
import Roles from './pages/roles/Roles';
import Branches from './pages/branches/Branches';
import Counters from './pages/counters/Counters';
import Printers from './pages/printers/Printers';
import AuditLogs from './pages/audit/AuditLogs';
import Settings from './pages/settings/Settings';
import useAuthStore from './store/authStore';

const PrivateRoute = ({ children }) => {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POSBilling />} />
          {/* Inventory */}
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="stock" element={<Stock />} />
          <Route path="barcode" element={<BarcodeManagement />} />
          {/* Purchase */}
          <Route path="purchase" element={<Purchase />} />
          <Route path="suppliers" element={<Suppliers />} />
          {/* Operations */}
          <Route path="customers" element={<Customers />} />
          <Route path="returns" element={<Returns />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="cash" element={<CashManagement />} />
          {/* Reports */}
          <Route path="reports" element={<Reports />} />
          {/* Users */}
          <Route path="users" element={<Users />} />
          <Route path="roles" element={<Roles />} />
          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          <Route path="branches" element={<Branches />} />
          <Route path="counters" element={<Counters />} />
          <Route path="printers" element={<Printers />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
