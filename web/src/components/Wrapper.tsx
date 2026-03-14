import type { ReactNode } from "react";
import "./Wrapper.css";
import Logo from "./Logo";


export default function Wrapper({children}: {children: ReactNode})  {
    return (
        <div className="wrapper">
            <Logo/>
            {children}
        </div>
    )
}