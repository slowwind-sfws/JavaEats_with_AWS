import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import DefaultPage from "./components/DefaultPage";
import ItemDetailPage from "./components/ItemDetailPage";
import OrderConfirmPage from "./components/OrderConfirmPage";
import OrderCompletePage from "./components/OrderCompletePage";
import UserProfilePage from "./components/UserProfilePage";

const routesBasic = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<DefaultPage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
            <Route path="/order/confirm" element={<OrderConfirmPage />} />
            <Route path="/order/complete" element={<OrderCompletePage />} />
            <Route path="/user/profile" element={<UserProfilePage />} />
        </>
    )
)

export default routesBasic
