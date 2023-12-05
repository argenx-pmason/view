import { useState, useEffect, useRef } from "react";
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
  Snackbar,
  Button,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  DataGridPro,
  LicenseInfo,
  GridColumnMenu,
  useGridApiContext,
  gridColumnDefinitionsSelector,
  // GridEditSingleSelectCell,
  GridCellEditStopReasons,
  // GridColumnMenuProps,
  // GridColumnMenuItemProps,
  // GridToolbar,
  // GridRowModes,
  // GridToolbarContainer,
  // GridActionsCellItem,
  // GridRowEditStopReasons,
  // GridToolbarExport,
} from "@mui/x-data-grid-pro";
import {
  Info,
  AlignHorizontalLeft,
  AlignHorizontalRight,
} from "@mui/icons-material";
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
    [openSnackbar, setOpenSnackbar] = useState(false),
    handleCloseSnackbar = (event, reason) => {
      if (reason === "clickaway") {
        return;
      }
      setOpenSnackbar(false);
    },
    [message, setMessage] = useState(""), // message to display in snackbar
    [anchorEl, setAnchorEl] = useState(null),
    [openInfo, setOpenInfo] = useState(false),
    [rows, setRows] = useState([]),
    [cols, setCols] = useState([]),
    [current, setCurrent] = useState(null),
    [jsonUrl, setJsonUrl] = useState(null),
    Align = (props) => {
      const { myCustomHandler, align } = props;
      return (
        <MenuItem onClick={myCustomHandler}>
          <ListItemIcon>
            {align === "left" ? (
              <AlignHorizontalLeft fontSize="small" />
            ) : (
              <AlignHorizontalRight fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{align}</ListItemText>
        </MenuItem>
      );
    },
    CustomColumnMenu = (props) => {
      const apiRef = useGridApiContext();
      return (
        <GridColumnMenu
          {...props}
          slots={{
            right: Align,
            left: Align,
          }}
          slotProps={{
            right: {
              align: "right",
              myCustomHandler: (e) => {
                const c = gridColumnDefinitionsSelector(apiRef);
                c.forEach((col) => {
                  col.headerAlign = "right";
                  col.align = "right";
                });
                console.log(e, c);
                // apiRef.current.align("", "right");
              },
            },
            left: {
              align: "left",
              myCustomHandler: (e) => {
                const c = gridColumnDefinitionsSelector(apiRef);
                c.forEach((col) => {
                  col.headerAlign = "left";
                  col.align = "left";
                });
                console.log(e, c);
                // apiRef.current.align("", "right");
              },
            },
          }}
        />
      );
    },
    editingRow = useRef(null),
    // CustomTypeEditComponent(props) {
    //   const { setRows, ...other } = props;

    //   const handleValueChange = () => {
    //     setRows((prevRows) => {
    //       console.log(prevRows);
    //       return prevRows.map((row) =>
    //         row.id === props.id ? { ...row, account: null } : row,
    //       );
    //     });
    //   };

    //   return <GridEditSingleSelectCell onValueChange={handleValueChange} {...other} />;
    // },
    handleCellEditStart = (params) => {
      editingRow.current = rows.find((row) => row.id === params.id) || null;
    },
    handleCellEditStop = (params) => {
      if (params.reason === GridCellEditStopReasons.escapeKeyDown) {
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === editingRow.current?.id
              ? { ...row, account: editingRow.current?.account }
              : row
          )
        );
      }
    },
    processRowUpdate = (newRow) => {
      console.log("newRow", newRow);
      setRows((prevRows) =>
        prevRows.map((row) => (row.id === newRow?.id ? newRow : row))
      );
      return newRow;
    },
    updateJsonFile = (file, content) => {
      console.log("updateJsonFile - file:", file, "content:", content);
      if (!file || !content) return;
      // drop id from each row in content
      const contentWithoutId = content.map((c) => {
        delete c.id;
        return c;
      });
      // try to delete the file, in case it is there already, otherwise the PUT will not work
      fetch(file, {
        method: "DELETE",
      })
        .then((response) => {
          console.log("response", response);
          fetch(file, {
            method: "PUT",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify(contentWithoutId),
          })
            .then((response) => {
              setMessage(response.ok ? "File saved" : "File not saved");
              setOpenSnackbar(true);
              console.log("response", response);
              response.text().then(function (text) {
                console.log("text", text);
              });
            })
            .catch((err) => {
              setMessage(err);
              setOpenSnackbar(true);
              console.log("PUT err: ", err);
            });
        })
        .catch((err) => {
          setMessage(
            "DELETE was attempted before the new version was saved - but the DELETE failed. (see console)"
          );
          setOpenSnackbar(true);
          console.log("DELETE err: ", err);
        });
    };

  // fetch a JSON file to display in table
  useEffect(() => {
    if (mode === "local") {
      setRows(localData.map((d, i) => ({ ...d, id: i }))); // add an id field to each row
      setCols(
        Object.keys(localData[0]).map((k) => ({
          field: k,
          headerName: k,
          editable: true,
        }))
      );
      setJsonUrl(
        "https://xarprod.ondemand.sas.com/lsaf/webdav/repo/general/biostat/jobs/dashboard/dev/output/sapxlsx/sap_updates.json"
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
        setJsonUrl(url);
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
          // setRows(data);
          setRows(data.map((d, i) => ({ ...d, id: i }))); // add an id field to each row
          setCols(
            Object.keys(data[0]).map((k) => ({
              field: k,
              headerName: k,
              editable: true,
            }))
          );
        });
    }
  }, [href, mode]);

  console.log("rows", rows, "cols", cols);

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
            {current ? (
              <span>
                <b>Currently viewing</b> {current}
              </span>
            ) : (
              ""
            )}
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
        rowHeight={22}
        density="compact"
        // getRowId={(row) => row.__id__}
        // autoHeight
        pageSizeOptions={[25, 100, 1000]}
        pagination
        editMode="row"
        slots={{ columnMenu: CustomColumnMenu }}
        sx={{
          width: window.innerWidth - 100,
          fontWeight: "fontSize=5",
          fontSize: "0.7em",
          padding: 1,
        }}
        onCellEditStart={handleCellEditStart}
        onCellEditStop={handleCellEditStop}
        processRowUpdate={processRowUpdate}
      />
      <Tooltip title="Save JSON back to server">
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          onClick={() => {
            updateJsonFile(jsonUrl, rows);
          }}
        >
          Save
        </Button>
      </Tooltip>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={message}
      />
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
            <li>
              <b>Double click</b> on a cell to edit that row.
            </li>
            <li>
              Press <b>enter</b> to finish editing the row.
            </li>
            <li>
              Press <b>escape</b> to cancel editing the row.
            </li>
            <li>
              Click on the column header and then the <b>3 vertical dots</b> to
              sort the column.
            </li>
            <li>
              Click on the <b>SAVE</b> button to write the JSON file back to the
              location it was loaded from.
            </li>
            <li>
              Pressing <b>SAVE</b> will first delete the file that was there
              (using HTTP DELETE), and then does an writes the file to server
              (using HTTP PUT).
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default App;
