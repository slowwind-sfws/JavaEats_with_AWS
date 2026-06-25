import { RouterProvider } from 'react-router-dom';
import routesBasic from './route';

function App() {
  return (
    <RouterProvider router={routesBasic} />
  );
}

export default App;