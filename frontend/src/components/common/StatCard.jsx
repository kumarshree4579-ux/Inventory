import { Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const StatCard = ({ title, value, icon, color = 'primary.main', subtitle, trend, onClick }) => (
  <Card
    sx={{ height: '100%', ...(onClick && { cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }) }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>{title}</Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>{value}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>
          )}
        </Box>
        <Box sx={{
          p: 1.5, borderRadius: 2.5,
          bgcolor: `${color}18`,
          color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default StatCard;
