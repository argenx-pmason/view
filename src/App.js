import { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Toolbar,
  IconButton,
  AppBar,
  MenuItem,
  Menu,
  // Link,
  Button,
} from "@mui/material";
import {
  DataGridPro,
  LicenseInfo,
  // GridToolbar,
  // GridRowModes,
  // GridToolbarContainer,
  // GridActionsCellItem,
  // GridRowEditStopReasons,
  // GridToolbarExport,
} from "@mui/x-data-grid-pro";
import { Info } from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import "./App.css";
import localData from "./data.json";
// apply the license for data grid
LicenseInfo.setLicenseKey(
  "369a1eb75b405178b0ae6c2b51263cacTz03MTMzMCxFPTE3MjE3NDE5NDcwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
);
function App() {
  const { href } = window.location, // get the URL so we can work out where we are running
    mode = href.startsWith("http://localhost") ? "local" : "remote", // local or remote, which is then used for development and testing
    webDavPrefix = "https://xarprod.ondemand.sas.com/lsaf/webdav/repo", // prefix for webdav access to LSAF
    // fileViewerPrefix =
    //   "https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd:/general/biostat/tools/fileviewer/index.html?file=",
    // logViewerPrefix =
    //   "https://xarprod.ondemand.sas.com/lsaf/webdav/repo/general/biostat/tools/logviewer/index.html",
    variable = "123",
    handleClickMenu = (event) => {
      setAnchorEl(event.currentTarget);
    },
    handleCloseMenu = () => {
      setAnchorEl(null);
    },
    links = [
      {
        name: "Control Centre",
        url: "https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/control/index.html",
      },
    ],
    [anchorEl, setAnchorEl] = useState(null),
    [openInfo, setOpenInfo] = useState(false),
    [rows, setRows] = useState([]),
    [cols, setCols] = useState([]),
    [current, setCurrent] = useState(null);

  // fetch a JSON file to display in table
  useEffect(() => {
    if (mode === "local") {
      setRows(localData);
      setCols(
        Object.keys(localData[0]).map((k) => ({
          field: k,
          headerName: k,
          editable: true,
        }))
      );
    } else {
      const split = href.split("?"),
        parsed = {};
      let parms, url;
      if (split.length > 1) {
        parms = split[1].split("&");
      }
      parms?.forEach((p) => {
        const [k, v] = p.split("=");
        parsed[k] = v;
      });
      if ("lsaf" in parsed) {
        setCurrent(parsed.lsaf);
        url = `${webDavPrefix}${parsed.lsaf}`;
      }
      console.log(
        "href",
        href,
        "split",
        split,
        "parms",
        parms,
        "parsed",
        parsed,
        "url",
        url
      );
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setRows(data);
          setCols(
            Object.keys(data[0]).map((k) => ({ field: k, headerName: k }))
          );
        });
    }
  }, [href, mode]);

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar variant="dense">
          <Tooltip title="Menu">
            <IconButton
              edge="start"
              color="inherit"
              sx={{ mr: 2 }}
              onClick={handleClickMenu}
              aria-label="menu"
              aria-controls={Boolean(anchorEl) ? "View a table" : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl) ? "true" : undefined}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Box color="inherit">JSON File Viewer</Box>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Box sx={{ flexGrow: 0.5, fontSize: "0.8em", textAlign: "right" }}>
            {current ? `Currently viewing ${current}` : ""}
          </Box>
          <Tooltip title="Information about this screen">
            <IconButton
              color="inherit"
              // sx={{ mr: 2 }}
              onClick={() => {
                setOpenInfo(true);
              }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <DataGridPro
        columns={cols}
        rows={rows}
        getRowId={(row) => Math.random() * 1000000}
        // autoHeight
        pageSizeOptions={[25, 100, 1000]}
        pagination
        editMode="row"
        sx={{
          width: window.innerWidth - 100,
          height: window.innerHeight - 100,
        }}
      />
      <Tooltip title="Save JSON back to server">
        <Button variant="contained" sx={{ mt: 1 }} onClick={() => {}}>
          Save
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="link-menu"
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        onClick={handleCloseMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {links.map((t, id) => (
          <MenuItem key={"menuItem" + id} onClick={handleCloseMenu}>
            <Tooltip key={"tt" + id}>
              <Box
                color={"success"}
                size="small"
                variant="outlined"
                onClick={() => {
                  window.open(t.url, "_blank").focus();
                  // handleCloseMenu();
                }}
                // sx={{ mb: 1 }}
              >
                {t.name}
              </Box>
            </Tooltip>
          </MenuItem>
        ))}
      </Menu>
      {/* Dialog with General info about this screen */}
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenInfo(false)}
        open={openInfo}
      >
        <DialogTitle>Info about this screen</DialogTitle>
        <DialogContent>
          <ul>
            <li>Currently under development ...</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default App;
