import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import SymptomEntry from './pages/SymptomEntry';
import Results from './pages/Results';
import Resources from './pages/Resources';
import { ProcessingProvider } from './contexts/ProcessingContext';
import GlobalProgressBar from './components/GlobalProgressBar';

function App() {
    return (
        <ProcessingProvider>
            <GlobalProgressBar />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<Home />} />
                        <Route path="session" element={<SymptomEntry />} />
                        <Route path="results" element={<Results />} />
                        <Route path="resources" element={<Resources />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ProcessingProvider>
    );
}

export default App;
