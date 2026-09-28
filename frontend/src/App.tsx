import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VectorStoreProvider } from "./context/VectorStoreContext";
import { Chrome } from "./components/Chrome";
import { Board } from "./pages/Board";
import { DocumentPage } from "./pages/DocumentPage";
import { HowItWorks } from "./pages/HowItWorks";

export function App() {
  return (
    <BrowserRouter>
      <VectorStoreProvider>
        <Chrome>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/document/:id" element={<DocumentPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
          </Routes>
        </Chrome>
      </VectorStoreProvider>
    </BrowserRouter>
  );
}