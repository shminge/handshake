import { useEffect, useState } from 'react'
import './App.css'
import Connected from './components/Connected';
import Pending from './components/Pending';


const WS_URL = "ws://127.0.0.1:1234"
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
