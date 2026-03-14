import { useState } from 'react'
import './App.css'
import Connected from './components/Connected';
import Pending from './components/Pending';


function App() {
  

  const [connected, setConnected] = useState(false);



  return (
    <>
    {connected ? <Connected/> : <Pending/>}
    <p>
    </p>
    </>
  )
}

export default App
