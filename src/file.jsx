import { useState } from "react"


function File ({ item }) {
    const [expand, setExpand] = useState(false)

    const onClick = (e) => {
        e.stopPropagation();
        setExpand(prev => !prev)
    }
  
    return (
        <li>
            <span onClick={item.children ? onClick : null}>
                {item.name}
            </span>

            <button>Hi</button>
                {expand &&
                <ul>{item.children && item.children.map((child, index) => <File key={index} item={child}/>)}</ul>}
        </li>
    )
}
export default File