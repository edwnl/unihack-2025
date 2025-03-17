const folderStructure = [
    {
      name: "Root",
      children: [
        {
          name: "public",
          children: [
            { name: "index.html", type: "file" },
            { name: "favicon.ico", type: "file" }
          ]
        },
        {
          name: "src",
          children: [
            {
              name: "components",
              type: "folder",
              children: [
                { name: "Navbar.jsx", type: "file" },
                { name: "Sidebar.jsx", type: "file" }
              ]
            },
            {
              name: "utils",
              type: "folder",
              children: [
                { name: "helpers.js", type: "file" },
                { name: "constants.js", type: "file" }
              ]
            },
            { name: "App.jsx", type: "file" },
            { name: "index.js", type: "file" }
          ]
        },
        {
          name: "assets",
          children: [
            {
              name: "images",
              type: "folder",
              children: [{ name: "background.jpg", type: "file" }]
            },
            {
              name: "styles",
              type: "folder",
              children: [{ name: "main.css", type: "file" }]
            }
          ]
        }
      ]
    }
  ];
  
  export default folderStructure;