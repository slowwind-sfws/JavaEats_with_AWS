import { RouterProvider } from 'react-router-dom';
import routesBasic from './route';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routesBasic} />
    </AuthProvider>
  );
}

export default App;