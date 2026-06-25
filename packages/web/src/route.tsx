import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import DefaultPage from "./components/DefaultPage";

const routesBasic = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<DefaultPage />} />
        </>
    )
)

export default routesBasic