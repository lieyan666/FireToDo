
import { createTheme } from '@mui/material/styles';

export const getAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#018eee',
    },
    ...(mode === 'light'
      ? {
          // Palette values for light mode
          background: {
            default: '#f4f6f8',
            paper: '#ffffff',
          },
        }
      : {
          // Palette values for dark mode
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Ensure paper components in dark mode don't have weird gradients
        },
      },
    },
  },
});
