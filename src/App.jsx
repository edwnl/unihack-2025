import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import folderStructure from './folderStructure'
import File from './file'

function App() {
  
  ma

  return (
    <>
    <div>
      {folderStructure.map(item => <ul><File item={folderStructure[0]}/></ul>)}
    </div>
    </>
  )
}

export default App
