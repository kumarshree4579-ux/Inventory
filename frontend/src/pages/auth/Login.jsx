import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { useForm } from 'react-hook-form';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const onSubmit = async (data) => {
    try {
      setError('');
      const result = await login(data);
      if (result.requireOTP) return navigate('/verify-otp', { state: { userId: result.userId } });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <Card sx={{ width: 400, border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: 3,
              background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
              boxShadow: '0 8px 20px rgba(79,70,229,0.4)',
            }}>
              <Inventory2Icon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>Inventory Pro</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Sign in to your account</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth label="Username or Email" margin="normal"
              {...register('username', { required: 'Required' })}
              error={!!errors.username} helperText={errors.username?.message}
            />
            <TextField
              fullWidth label="Password" type={showPwd ? 'text' : 'password'} margin="normal"
              {...register('password', { required: 'Required' })}
              error={!!errors.password} helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(p => !p)} edge="end">
                      {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button fullWidth variant="contained" type="submit" size="large" sx={{ mt: 2.5, py: 1.25 }} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
