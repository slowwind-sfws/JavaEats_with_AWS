import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import DefaultPage from "./components/DefaultPage";
import ItemDetailPage from "./components/ItemDetailPage";

const routesBasic = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<DefaultPage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
        </>
    )
)

export default routesBasic
