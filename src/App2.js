import React, { useState, useEffect, useRef } from "react";
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
  Snackbar,
  Button,
  ListItemIcon,
  ListItemText,
  Popper,
  Paper,
  Typography,
} from "@mui/material";
import {
  DataGridPro,
  LicenseInfo,
  GridColumnMenu,
  useGridApiContext,
  gridColumnDefinitionsSelector,
  GridCellEditStopReasons,
  useGridApiRef,
} from "@mui/x-data-grid-pro";
import {
  Info,
  AlignHorizontalLeft,
  AlignHorizontalRight,
  Add,
  Save,
  Wysiwyg,
  Visibility,
  Delete,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import MenuIcon from "@mui/icons-material/Menu";
import "./App.css";
import localData from "./data.json";
import localMeta from "./metadata.json";
// apply the license for data grid
LicenseInfo.setLicenseKey(
  "369a1eb75b405178b0ae6c2b51263cacTz03MTMzMCxFPTE3MjE3NDE5NDcwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
);

const GridCellExpand = React.memo(function GridCellExpand(props) {
    const { width, value } = props;
    const wrapper = React.useRef(null);
    const cellDiv = React.useRef(null);
    const cellValue = React.useRef(null);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [showFullCell, setShowFullCell] = React.useState(false);
    const [showPopper, setShowPopper] = React.useState(false);

    const handleMouseEnter = () => {
      const isCurrentlyOverflown = isOverflown(cellValue.current);
      setShowPopper(isCurrentlyOverflown);
      setAnchorEl(cellDiv.current);
      setShowFullCell(true);
    };

    const handleMouseLeave = () => {
      setShowFullCell(false);
    };

    useEffect(() => {
      if (!showFullCell) {
        return undefined;
      }

      function handleKeyDown(nativeEvent) {
        if (nativeEvent.key === "Escape") {
          setShowFullCell(false);
        }
      }

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [setShowFullCell, showFullCell]);

    return (
      <Box
        ref={wrapper}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          alignItems: "center",
          lineHeight: "24px",
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
        }}
      >
        <Box
          ref={cellDiv}
          sx={{
            height: "100%",
            width,
            display: "block",
            position: "absolute",
            top: 0,
          }}
        />
        <Box
          ref={cellValue}
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Box>
        {showPopper && (
          <Popper
            open={showFullCell && anchorEl !== null}
            anchorEl={anchorEl}
            style={{ width, marginLeft: -17 }}
          >
            <Paper
              elevation={1}
              style={{ minHeight: wrapper.current.offsetHeight - 3 }}
            >
              <Typography variant="body2" style={{ padding: 8 }}>
                {value}
              </Typography>
            </Paper>
          </Popper>
        )}
      </Box>
    );
  }),
  isOverflown = (element) => {
    return (
      element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth
    );
  };

function App() {
  const apiRef = useGridApiRef(),
    { href } = window.location, // get the URL so we can work out where we are running
    mode = href.startsWith("http://localhost") ? "local" : "remote", // local or remote, which is then used for development and testing
    webDavPrefix = "https://xarprod.ondemand.sas.com/lsaf/webdav/repo", // prefix for webdav access to LSAF
    fileViewerPrefix =
      "https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd:/general/biostat/tools/fileviewer/index.html?file=",
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
    [key, setKey] = useState(null),
    [dataUrl, setDataUrl] = useState(null),
    [metaUrl, setMetaUrl] = useState(null),
    renderCellExpand = (params) => {
      return (
        <GridCellExpand
          value={params.value || ""}
          width={params.colDef.computedWidth}
        />
      );
    },
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
      console.log("processRowUpdate: ", newRow);
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
  const [showMeta, setShowMeta] = useState(false),
    [disableSave, setDisableSave] = useState(false),
    addRecord = (e) => {
      const id = uuidv4();
      setRows((oldRows) => [...oldRows, { id: id }]);
      console.log("e", e);
    },
    deleteRecord = (e) => {
      // setRows((oldRows) => [...oldRows, { id: id }]);
      console.log("e", e, "apiRef", apiRef);
      const selected = apiRef.current.getSelectedRows();
      console.log("selected", selected);
      for (const key of selected.keys()) {
        setRows((oldRows) => oldRows.filter((row) => row.id !== key));
      }
    },
    getData = async (d, m) => {
      console.log("getData", d, m);
      const dUrl = `${webDavPrefix}${d}`,
        mUrl = `${webDavPrefix}${m}`;
      console.log("dUrl", dUrl, "mUrl", mUrl);
      let metaData = {};
      if (m) {
        const res = await fetch(mUrl);
        metaData = await res.json();
        console.log("metaData", metaData);
      }
      fetch(dUrl)
        .then((res) => res.json())
        .then((data) => {
          console.log("data", data);
          // setRows(data);
          let data2use = data;
          if (key) {
            data2use = data[key];
          }
          // TODO: check if the data is an array of objects, if not, make it so
          setRows(data2use.map((d, i) => ({ ...d, id: i }))); // add an id field to each row
          setCols(
            Object.keys(data2use[0]).map((k) => {
              let headerName = k,
                type = "string",
                valueOptions = null,
                width = null;
              if (metaData[k]) {
                headerName = metaData[k].label;
                type = metaData[k].type;
                valueOptions = metaData[k].valueOptions;
                width = metaData[k].width;
              }
              let valueGetter = null;
              if (type === "date" || type === "dateTime") {
                valueGetter = (row) => {
                  // console.log(row);
                  return row && new Date(row.value);
                };
              }
              return {
                field: k,
                headerName: headerName,
                editable: true,
                type: type,
                valueGetter: valueGetter,
                valueOptions: valueOptions,
                width: width,
                renderCell: renderCellExpand,
              };
            })
          );
        });
    };

  // fetch a JSON file to display in table
  useEffect(() => {
    console.log("mode", mode, "href", href, "key", key);
    if (mode === "local") {
      // console.log("localData", localData, "localMeta", localMeta);
      setRows(localData.map((d, i) => ({ ...d, id: i }))); // add an id field to each row
      setCols(
        Object.keys(localData[0]).map((k) => {
          // console.log("k", k, "localMeta[k]", localMeta[k]);
          let headerName = k,
            type = "string",
            valueOptions = null,
            width = null;
          if (localMeta[k]) {
            headerName = localMeta[k].label;
            type = localMeta[k].type;
            valueOptions = localMeta[k].valueOptions;
            width = localMeta[k].width;
          }
          let valueGetter = null;
          if (type === "date" || type === "dateTime") {
            valueGetter = (row) => {
              // console.log(row);
              return row && new Date(row.value);
            };
          }
          return {
            field: k,
            headerName: headerName,
            editable: true,
            type: type,
            valueGetter: valueGetter,
            valueOptions: valueOptions,
            width: width,
          };
        })
      );
      setDataUrl(
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
      console.log("split", split, "parms", parms, "parsed", parsed);
      if ("lsaf" in parsed) {
        setCurrent(parsed.lsaf);
        document.title = parsed.lsaf;
        url = `${webDavPrefix}${parsed.lsaf}`;
        setDataUrl(url);
      }
      if ("key" in parsed) {
        setKey(parsed.key);
        setDisableSave(false);
      } else {
        setDisableSave(true);
      }
      if ("meta" in parsed) {
        setMetaUrl(parsed.meta);
        url = `${webDavPrefix}${parsed.meta}`;
        setMetaUrl(url);
        setShowMeta(true);
      } else {
        setShowMeta(false);
      }
      getData(parsed.lsaf, parsed.meta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, mode, key]);

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar variant="dense" sx={{ backgroundColor: "#cccccc" }}>
          <Tooltip title="Menu">
            <IconButton
              edge="start"
              color="success"
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
          <Box
            sx={{
              backgroundColor: "#eeeeee",
              color: "green",
              typography: "h6",
              boxShadow: 2,
            }}
          >
            &nbsp;&nbsp;JSON File Editor&nbsp;&nbsp;
          </Box>
          <Tooltip title="Save JSON back to server (keyed files not yet supported)">
            <span>
              <Button
                variant="contained"
                disabled={!disableSave}
                sx={{ m: 1, ml: 2 }}
                onClick={() => {
                  updateJsonFile(dataUrl, rows);
                }}
                size="small"
                color="success"
                startIcon={<Save />}
              >
                Save
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            disabled={!disableSave}
            color="info"
            startIcon={<Add />}
            onClick={addRecord}
            size="small"
            sx={{ m: 1 }}
          >
            Add
          </Button>
          <Button
            variant="contained"
            disabled={!disableSave}
            color="info"
            startIcon={<Delete />}
            onClick={deleteRecord}
            size="small"
            sx={{ m: 1 }}
          >
            Delete
          </Button>
          <Tooltip title="View data from LSAF as a JSON file">
            <Button
              variant="contained"
              color="info"
              startIcon={<Visibility />}
              onClick={() => {
                window.open(`${fileViewerPrefix}${dataUrl}`, "_blank").focus();
              }}
              size="small"
              sx={{ m: 1 }}
            >
              Data
            </Button>
          </Tooltip>
          <Tooltip title="View metadata from LSAF as a JSON file">
            <span>
              <Button
                variant="contained"
                disabled={showMeta ? false : true}
                color="info"
                startIcon={<Wysiwyg />}
                onClick={() => {
                  window
                    .open(`${fileViewerPrefix}${metaUrl}`, "_blank")
                    .focus();
                }}
                size="small"
                sx={{ m: 1 }}
              >
                Meta
              </Button>
            </span>
          </Tooltip>
          <Box
            sx={{
              color: "darkgreen",
              fontWeight: "bold",
              flexGrow: 0.5,
              fontSize: "0.8em",
              textAlign: "left",
            }}
          >
            {current ? (
              <span>
                <b>Currently viewing</b> {current}{" "}
                {key ? ` with key: ${key}` : ""}
              </span>
            ) : mode === "local" ? (
              "Running locally"
            ) : (
              ""
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Tooltip title="Information about this screen">
            <IconButton
              color="info"
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
        apiRef={apiRef}
      />
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
        <DialogTitle>Info about this screen (to be completed)</DialogTitle>
        <DialogContent>
          <Box sx={{ color: "blue", fontSize: 10 }}>
            This tools works with JSON data that is arranged as an array of
            objects. That is the kind of JSON you get when using PROC JSON to
            export data from SAS. The metadata file is optional, but if it is
            provided, it can be used to define the columns in the table. The
            metadata file should be a JSON file with the same keys as the data
            file, and each key should have a label, type, and width. The type
            can be string, number, date, dateTime, or boolean. The width is
            optional, and is used to set the width of the column in the table.
            The data file can be keyed, in which case the key parameter should
            be provided in the URL. The key parameter is the key of the table to
            display. The data file can be viewed in a separate window by
            clicking the "Data" button. The metadata file can be viewed in a
            separate window by clicking the "Meta" button. The data can be saved
            back to the server by clicking the "Save" button. The data can be
            added to by clicking the "Add" button. The data can be deleted by
            clicking the "Delete" button.
          </Box>
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
          <b>URL parameters</b>
          <ul>
            <li>
              <b>lsaf</b> - the location of the JSON file to load
            </li>
            <li>
              <b>meta</b> - the location of the metadata file to load
            </li>
            <li>
              <b>key</b> - the key of the JSON file to load
            </li>
          </ul>
          <b>Sample uses</b>
          <ul>
            <li>
              <a href="https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/requests.json&meta=/general/biostat/tools/view/requests-metadata.json">
                View a JSON file, using metadata to define the columns
              </a>
            </li>
            <li>
              <a href="https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/requests.json">
                View a JSON file, without metadata and therefore treating all
                fields as strings
              </a>
            </li>
            <li>
              <a href="https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/data%20wtih%20keys.json&key=a">
                View a JSON file which has multiple tables with keys, specifying
                a key for which table you want to view
              </a>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default App;
