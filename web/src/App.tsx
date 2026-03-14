import { useState } from 'react'
import './App.css'
import Connected from './components/Connected'
import Pending from './components/Pending'
import Wrapper from './components/Wrapper';

function App() {
    const [channel, setChannel] = useState<RTCDataChannel | null>(null);

    return <Wrapper>
        {
            channel
                ? <Connected channel={channel} />
                : <Pending onConnected={setChannel} />
        }
    </Wrapper> 
}

export default App
