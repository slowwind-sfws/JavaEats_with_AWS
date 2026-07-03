import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import DefaultPage from "./components/DefaultPage";
import LoginPage from "./components/LoginPage";

const routesBasic = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<DefaultPage />} />
            <Route path="/login" element={<LoginPage />} />
        </>
    )
)

export default routesBasic