import { useState } from "react";

export default function Connected(
) {

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files != null) {
            const file = event.target.files[0];
            setSelectedFile(file);
        }
        
    }
    
    return (
        <div>
            <input
                type = "file"
                onChange = {handleFileSelect}
            />

            {selectedFile && (
                <div className="file-info">
                <p>Selected file: {selectedFile.name}</p>
                <p>File size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            )}

            <button>
                Upload
            </button>
        </div>
    )

}