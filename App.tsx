import React from 'react';
import { useAppStoreComplete } from './hooks/useAppStore';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { ShaderCanvas } from './components/ShaderCanvas';
import { EditorPanel } from './components/EditorPanel';
import { ShipOverlay } from './components/ShipOverlay';
import { Hud } from './components/Hud';
import { ControlsPanel } from './components/ControlsPanel';
import { NewSessionModal } from './components/NewSessionModal';
import { DpadControls } from './components/DpadControls';

const App = () => {
  const store = useAppStoreComplete();
  
  return (
    <AppProvider value={store}>
      <div className="flex flex-col h-screen bg-black overflow-hidden font-sans select-none text-gray-200">
        <Header />
        
        <main className="flex-1 relative flex overflow-hidden">
          <div className="flex-1 relative flex flex-col items-center justify-center bg-gray-950">
             <ShaderCanvas />
             <ShipOverlay />
             <Hud />
             <DpadControls />
          </div>
          
          <EditorPanel />
        </main>
        
        <ControlsPanel />
        <NewSessionModal />
      </div>
    </AppProvider>
  );
};

export default App;
