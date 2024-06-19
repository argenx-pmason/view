import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
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
  Select,
  Snackbar,
  Button,
  Grid,
  Link,
  ListItemIcon,
  ListItemText,
  InputBase,
  Switch,
  Popper,
  Paper,
  Chip,
} from "@mui/material";
import {
  DataGridPro,
  LicenseInfo,
  GridColumnMenu,
  useGridApiContext,
  gridColumnDefinitionsSelector,
  GridCellEditStopReasons,
  useGridApiRef,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter,
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
  FileCopy,
  Remove,
  CloudDownload,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import MenuIcon from "@mui/icons-material/Menu";
import { JSONTree } from "react-json-tree";
import "./App.css";
import localData from "./data.json";
import localMeta from "./metadata.json";
import links from "./links.json";
// apply the license for data grid
LicenseInfo.setLicenseKey(
  "369a1eb75b405178b0ae6c2b51263cacTz03MTMzMCxFPTE3MjE3NDE5NDcwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
);
function App() {
  const apiRef = useGridApiRef(),
    keepBackups = 20, // keep this many backups of data, which are saved each time you open the data in the app
    { href, host } = window.location, // get the URL so we can work out where we are running
    mode = href.startsWith("http://localhost") ? "local" : "remote",
    webDavPrefix = "https://" + host + "/lsaf/webdav/repo", // prefix for webdav access to LSAF
    fileViewerPrefix =
      "https://" +
      host +
      "/lsaf/filedownload/sdd:/general/biostat/tools/fileviewer/index.html?file=",
    // logViewerPrefix =
    //   "https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/logviewer/index.html?log=",
    logViewerPrefix =
      "https://" +
      host +
      "/lsaf/filedownload/sdd:/general/biostat/tools/logviewer/index.html?log=",
    handleClickMenu = (event) => {
      setAnchorEl(event.currentTarget);
    },
    handleCloseMenu = () => {
      setAnchorEl(null);
    },
    [pinnedColumns, setPinnedColumns] = useState({ left: [] }),
    handlePinnedColumnsChange = useCallback((updatedPinnedColumns) => {
      setPinnedColumns(updatedPinnedColumns);
    }, []),
    [uniqueValues, setUniqueValues] = useState(null),
    [availableKeys, setAvailableKeys] = useState([]),
    [showBackups, setShowBackups] = useState(false),
    [openSnackbar, setOpenSnackbar] = useState(false),
    handleCloseSnackbar = (event, reason) => {
      if (reason === "clickaway") {
        return;
      }
      setOpenSnackbar(false);
    },
    [fontSize, setFontSize] = useState(10),
    [title, setTitle] = useState("JSON File Editor"), // title of the screen
    [message, setMessage] = useState(""), // message to display in snackbar
    [anchorEl, setAnchorEl] = useState(null),
    [openInfo, setOpenInfo] = useState(false),
    [rows, setRows] = useState([]),
    [cols, setCols] = useState([]),
    [current, setCurrent] = useState(null),
    [key, setKey] = useState(null),
    [dataUrl, setDataUrl] = useState(null),
    [metaUrl, setMetaUrl] = useState(null),
    [backups, setBackups] = useState([]),
    [checked, setChecked] = useState(false),
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
    CustomToolbar = () => {
      return (
        <GridToolbarContainer>
          <GridToolbarColumnsButton />
          <GridToolbarFilterButton />
          <GridToolbarDensitySelector />
          <GridToolbarExport />
          {uniqueValues &&
            Array.from(uniqueValues.values).map((u) => {
              return (
                <Button
                  color="success"
                  variant="outlined"
                  size="small"
                  key={"key-" + u}
                  sx={{ fontSize: 10, fontWeight: "bold", minWidth: 10 }}
                  onClick={(e, id) => {
                    // const column = apiRef.current.getColumn("request");console.log("column", column);
                    apiRef.current.upsertFilterItems([
                      {
                        field: uniqueValues.key,
                        operator:
                          ["date", "datetime", "singleSelect"].includes(
                            uniqueValues.type
                          ) && !e.ctrlKey
                            ? "is"
                            : ["date", "datetime", "singleSelect"].includes(
                                uniqueValues.type
                              ) && e.ctrlKey
                            ? "not"
                            : "contains",
                        value: u,
                        id: id,
                      },
                    ]);
                  }}
                >
                  {u ? u : "blank"}
                </Button>
              );
            })}
          {uniqueValues && (
            <Button
              color="success"
              variant="contained"
              size="small"
              key={"clear"}
              sx={{ fontSize: 10, minWidth: 10 }}
              onClick={(e) => {
                apiRef.current.upsertFilterItems([]);
              }}
            >
              Clear
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <GridToolbarQuickFilter />
        </GridToolbarContainer>
      );
    },
    EditTextarea = (props) => {
      const { id, field, value, colDef, hasFocus } = props;
      const [valueState, setValueState] = useState(value);
      const [anchorEl, setAnchorEl] = useState();
      const [inputRef, setInputRef] = useState(null);
      const apiRef = useGridApiContext();

      useLayoutEffect(() => {
        if (hasFocus && inputRef) {
          inputRef.focus();
        }
      }, [hasFocus, inputRef]);

      const handleRef = useCallback((el) => {
        setAnchorEl(el);
      }, []);

      const handleChange = useCallback(
        (event) => {
          const newValue = event.target.value;
          setValueState(newValue);
          apiRef.current.setEditCellValue(
            { id, field, value: newValue, debounceMs: 200 },
            event
          );
        },
        [apiRef, field, id]
      );

      return (
        <div style={{ position: "relative", alignSelf: "flex-start" }}>
          <div
            ref={handleRef}
            style={{
              height: 1,
              width: colDef.computedWidth,
              display: "block",
              position: "absolute",
              top: 0,
            }}
          />
          {anchorEl && (
            <Popper open anchorEl={anchorEl} placement="bottom-start">
              <Paper
                elevation={1}
                sx={{ p: 1, minWidth: colDef.computedWidth }}
              >
                <InputBase
                  multiline
                  rows={4}
                  value={valueState}
                  sx={{ textarea: { resize: "both" }, width: "100%" }}
                  onChange={handleChange}
                  inputRef={(ref) => setInputRef(ref)}
                />
              </Paper>
            </Popper>
          )}
        </div>
      );
    },
    multilineColumn = {
      type: "string",
      renderEditCell: (params) => <EditTextarea {...params} />,
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
                // apiRef.current.align("", "right");
              },
            },
          }}
        />
      );
    },
    isKeyboardEvent = (event) => {
      return !!event.key;
    },
    editingRow = useRef(null),
    handleCellEditStart = (params) => {
      editingRow.current = rows.find((row) => row.id === params.id) || null;
    },
    handleCellEditStop = (params, event) => {
      if (params.reason === GridCellEditStopReasons.escapeKeyDown) {
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === editingRow.current?.id
              ? { ...row, account: editingRow.current?.account }
              : row
          )
        );
      }
      if (params.reason !== GridCellEditStopReasons.enterKeyDown) {
        return;
      }
      if (isKeyboardEvent(event) && !event.ctrlKey && !event.metaKey) {
        event.defaultMuiPrevented = true;
      }
    },
    processRowUpdate = (newRow) => {
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
        }),
        tempContent = JSON.stringify(contentWithoutId);
      backup(tempContent);
      // try to delete the file, in case it is there already, otherwise the PUT will not work
      fetch(file, {
        method: "DELETE",
      })
        .then((response) => {
          fetch(file, {
            method: "PUT",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            body: tempContent,
          })
            .then((response) => {
              setMessage(response.ok ? "File saved" : "File not saved");
              setOpenSnackbar(true);
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
    [allowSave, setAllowSave] = useState(true),
    addRecord = (e) => {
      const id = uuidv4();
      setRows((oldRows) => [...oldRows, { id: id }]);
    },
    deleteRecord = (e) => {
      // setRows((oldRows) => [...oldRows, { id: id }]);
      const selected = apiRef.current.getSelectedRows();
      for (const key of selected.keys()) {
        setRows((oldRows) => oldRows.filter((row) => row.id !== key));
      }
    },
    duplicateRecord = (e) => {
      const selected = apiRef.current.getSelectedRows();
      const extraRows = [];
      for (const key of selected.keys()) {
        const dup = rows.filter((row) => row.id === key);
        extraRows.push({ ...dup[0], id: uuidv4() });
      }
      setRows([...rows, ...extraRows]);
    };
  const sortDataAndSetRows = (ddd, mmm) => {
      // find any sort key that may be in the metadata
      const sortBy = Object.keys(mmm)
        .map((k) => {
          if (mmm[k].sort) return { key: k, sort: mmm[k].sort };
          else return undefined;
        })
        .filter((s) => {
          return s !== undefined;
        });

      if (sortBy.length > 0) {
        // sort multiple sort keys
        sortBy.sort((a, b) => {
          return a.sort - b.sort;
        }); // sort by the sort order
        // make a sort key that combines the things we want to sort by
        // add a sort key to each row
        console.log("ddd", ddd);
        ddd.forEach((d) => {
          const sortKey = sortBy.map((s) => s.key),
            sortValue = sortKey.map((k) => d[k]).join(" ");
          d["#sortKey"] = sortValue;
        });
        ddd.sort((a, b) => {
          const sortKey = [sortBy[0].key];
          if (a["#sortKey"] && b["#sortKey"]) {
            if (mmm[sortKey].sort > 0)
              return a["#sortKey"].localeCompare(b["#sortKey"]);
            else return b["#sortKey"].localeCompare(a["#sortKey"]);
          }
          return 0;
        });
      }
      setRows(ddd.map((d, i) => ({ ...d, id: i }))); // add an id field to each row
    },
    loadBackup = (b) => {
      setShowBackups(false);
      const tempRows = JSON.parse(localStorage.getItem(b)).map((r) => ({
        ...r,
        id: uuidv4(),
      }));
      console.log("loading backup -> ", b, "tempRows", tempRows);
      // setRows(tempRows);
      setRows(tempRows);
    },
    backup = (r) => {
      // if we already have rows, then save them to localStorage as a backup with a key using date and time
      if (r.length > 0) {
        const backupKey = new Date().toISOString().replace(/:/g, "_"),
          backups = Object.keys(localStorage)
            .filter((k) => k.startsWith("backup"))
            .sort((a, b) => a.localeCompare(b));
        if (JSON.stringify(r).length < 10000) {
          localStorage.setItem("backup-" + backupKey, JSON.stringify(r));
        }
        console.log("backups", backups);
        if (backups.length > keepBackups) {
          // only keep a limited number of backups, removing others
          for (let i = 0; i <= backups.length - keepBackups; i++) {
            console.log("removing", backups[i]);
            localStorage.removeItem(backups[i]);
          }
        }
      }
    },
    getData = async (d, m, k) => {
      console.log("getData", d, m, k);
      const dUrl = `${webDavPrefix}${d}`,
        mUrl = `${webDavPrefix}${m}`;
      console.log("dUrl", dUrl, "mUrl", mUrl);
      let metaData = {};
      if (m) {
        const res = await fetch(mUrl);
        metaData = await res.json();
      }
      fetch(dUrl)
        .then((res) => res.json())
        .then((data) => {
          const tempAvailableKeys = Object.keys(data);
          setAvailableKeys(tempAvailableKeys);
          let data2use = data;
          if (k) {
            data2use = data[k];
          }
          console.log("data2use", data2use, "key", k, "metaData", metaData);
          // TODO: check if the data is an array of objects, if not, make it so
          sortDataAndSetRows(data2use, metaData);
          const tempRows = data2use.map((d, i) => ({ ...d, id: i })); // add an id field to each row
          // backup(tempRows);
          setRows(tempRows);
          const metaKeys = Object.keys(metaData),
            dataKeys = Object.keys(data2use[0]),
            combinedKeys = metaKeys
              .concat(dataKeys.filter((item) => metaKeys.indexOf(item) < 0))
              .filter((k) => k.startsWith("#") === false);
          let pins = [];
          // handle the special metadata with keys that start with #
          // #viewonly - if this key is present, then the user cannot save the data back to the server
          metaKeys.forEach((k) => {
            if (k === "#viewonly") setAllowSave(false);
          });
          setCols(
            combinedKeys.map((k) => {
              let headerName = k,
                type = "string",
                valueOptions = null,
                width = null,
                link = false,
                log = false,
                logverKeyToUse = null,
                file = false,
                fileverKeyToUse = null,
                short = null,
                heatmap = null,
                filter = null,
                pin = null,
                multiline = false;
              if (metaData[k]) {
                headerName = metaData[k].label;
                type = metaData[k].type;
                valueOptions = metaData[k].valueOptions;
                width = metaData[k].width;
                link = metaData[k].link;
                log = metaData[k]?.log;
                logverKeyToUse = metaData[k]?.logver;
                file = metaData[k]?.file;
                fileverKeyToUse = metaData[k]?.filever;
                short = metaData[k]?.short;
                heatmap = metaData[k]?.heatmap;
                filter = metaData[k]?.filter;
                pin = metaData[k]?.pin;
                multiline = metaData[k]?.multiline;
              }

              let valueGetter = null;
              if (type === "date" || type === "dateTime") {
                valueGetter = (row) => {
                  return row && new Date(row.value);
                };
              }
              let renderCell = null;
              if (log || file || link) {
                renderCell = (params) => {
                  const { row } = params,
                    logver = row[logverKeyToUse]
                      ? "?version=" + row[logverKeyToUse]
                      : "",
                    filever = row[fileverKeyToUse]
                      ? "?version=" + row[fileverKeyToUse]
                      : "",
                    url =
                      params.value > " " && log
                        ? logViewerPrefix + params.value + logver
                        : params.value > " " && file
                        ? fileViewerPrefix + params.value + filever
                        : params.value;
                  if (url.startsWith("http")) {
                    return (
                      <Link href={url} target="_blank" rel="noreferrer">
                        {short || params.value}
                      </Link>
                    );
                  } else return "n/a";
                };
              } else if (heatmap) {
                renderCell = (params) => {
                  const color = heatmap[params.value] || "white";
                  return (
                    <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                      {params.value}
                    </Box>
                  );
                };
              }
              if (filter) {
                const tempUniqueValues = Array.from(
                  new Set(data2use.map((row) => row[k]))
                ).filter((v) => v !== undefined);
                setUniqueValues({
                  key: k,
                  type: type,
                  values: tempUniqueValues,
                });
              }
              if (pin) {
                pins = [...pins, k];
                const pinsUnique = [...new Set(pins)];
                setPinnedColumns({ left: pinsUnique });
              }
              let columnDefinition = {
                field: k,
                headerName: headerName,
                editable: true,
                type: type,
                valueGetter: valueGetter,
                valueOptions: valueOptions,
                renderCell: renderCell,
                width: width,
              };
              if (multiline) {
                columnDefinition = {
                  field: k,
                  headerName: headerName,
                  editable: true,
                  type: type,
                  valueGetter: valueGetter,
                  valueOptions: valueOptions,
                  renderCell: renderCell,
                  width: width,
                  ...multilineColumn,
                };
              }
              return columnDefinition;
            })
          );
        });
    },
    handleLocal = () => {
      console.log("localData", localData, "localMeta", localMeta);
      const tempAvailableKeys = Object.keys(localData);
      console.log("tempAvailableKeys", tempAvailableKeys);
      setAvailableKeys(tempAvailableKeys);
      sortDataAndSetRows(localData, localMeta);
      backup(localData);
      const metaKeys = Object.keys(localMeta),
        dataKeys = Object.keys(localData[0]),
        combinedKeys = metaKeys
          .concat(dataKeys.filter((item) => metaKeys.indexOf(item) < 0))
          .filter((k) => k.startsWith("#") === false);
      let pins = [];
      // handle the special metadata with keys that start with #
      // #viewonly - if this key is present, then the user cannot save the data back to the server
      metaKeys.forEach((k) => {
        if (k === "#viewonly") setAllowSave(false);
      });
      setCols(
        combinedKeys.map((k) => {
          let headerName = k,
            type = "string",
            valueOptions = null,
            width = null,
            log = false,
            logverKeyToUse = null,
            file = false,
            fileverKeyToUse = null,
            short = null,
            heatmap = null,
            filter = null,
            pin = null,
            multiline = false;
          if (localMeta[k]) {
            headerName = localMeta[k].label;
            type = localMeta[k].type;
            valueOptions = localMeta[k].valueOptions;
            width = localMeta[k].width;
            log = localMeta[k].log;
            logverKeyToUse = localMeta[k].logver;
            file = localMeta[k].file;
            fileverKeyToUse = localMeta[k].filever;
            short = localMeta[k].short;
            heatmap = localMeta[k].heatmap;
            filter = localMeta[k].filter;
            pin = localMeta[k].pin;
            multiline = localMeta[k].multiline;
          }
          let valueGetter = null;
          if (type === "date" || type === "dateTime") {
            valueGetter = (row) => {
              return row && new Date(row.value);
            };
          }
          let renderCell = null;
          if (log || file) {
            renderCell = (params) => {
              const { row } = params,
                logver = row[logverKeyToUse]
                  ? "?version=" + row[logverKeyToUse]
                  : "",
                filever = row[fileverKeyToUse]
                  ? "?version=" + row[fileverKeyToUse]
                  : "",
                url =
                  params.value > " " && log
                    ? logViewerPrefix + params.value + logver
                    : params.value > " " && file
                    ? fileViewerPrefix + params.value + filever
                    : " ";
              if (url.startsWith("http")) {
                return (
                  <Link href={url} target="_blank" rel="noreferrer">
                    {short || params.value}
                  </Link>
                );
              } else return "n/a";
            };
          } else if (heatmap) {
            renderCell = (params) => {
              const color = heatmap[params.value] || "white";
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {params.value}
                </Box>
              );
            };
          }
          if (filter) {
            const tempUniqueValues = Array.from(
              new Set(localData.map((row) => row[k]))
            ).filter((v) => v !== undefined);
            setUniqueValues({ key: k, type: type, values: tempUniqueValues });
          }
          if (pin) {
            pins = [...pins, k];
            const pinsUnique = [...new Set(pins)];
            setPinnedColumns({ left: pinsUnique });
          }
          let columnDefinition = {
            field: k,
            headerName: headerName,
            editable: true,
            type: type,
            valueGetter: valueGetter,
            valueOptions: valueOptions,
            renderCell: renderCell,
            width: width,
          };
          if (multiline) {
            columnDefinition = {
              field: k,
              headerName: headerName,
              editable: true,
              type: type,
              valueGetter: valueGetter,
              valueOptions: valueOptions,
              renderCell: renderCell,
              width: width,
              ...multilineColumn,
            };
          }
          return columnDefinition;
        })
      );
      setDataUrl(
        "https://" +
          host +
          "/lsaf/webdav/repo/general/biostat/jobs/dashboard/dev/output/sapxlsx/sap_updates.json"
      );
    };

  useEffect(() => {
    console.log("cols", cols);
  }, [cols]);

  // fetch a JSON file to display in table
  useEffect(() => {
    console.log("mode", mode, "href", href, "key", key, "allowSave", allowSave);
    setFontSize(Number(localStorage.getItem("fontSize")) || 10);
    const tempBackups = Object.keys(localStorage)
      .filter((k) => k.startsWith("backup"))
      .sort((a, b) => a.localeCompare(b));
    setBackups(tempBackups);
    if (mode === "local") {
      handleLocal();
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
      if ("title" in parsed) {
        const tempTitle = decodeURIComponent(parsed.title);
        setTitle(tempTitle);
        document.title = `${tempTitle} - ${parsed.lsaf}`;
      }
      if ("key" in parsed) {
        setKey(parsed.key);
        setAllowSave(false);
      } else {
        setAllowSave(true);
      }
      if ("meta" in parsed) {
        setMetaUrl(parsed.meta);
        url = `${webDavPrefix}${parsed.meta}`;
        setMetaUrl(url);
        setShowMeta(true);
      } else {
        setShowMeta(false);
      }
      getData(parsed.lsaf, parsed.meta, parsed.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, mode, key]);

  return (
    <div className="App">
      <AppBar position="fixed">
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
              fontWeight: "bold",
              boxShadow: 3,
              fontSize: 16,
            }}
          >
            &nbsp;&nbsp;{title}&nbsp;&nbsp;
          </Box>
          <Tooltip title="Switch between main and JSON tree views">
            <Switch
              checked={checked}
              onChange={() => {
                setChecked(!checked);
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          </Tooltip>
          <Tooltip title="Save JSON back to server (keyed files not yet supported)">
            <span>
              <Button
                variant="contained"
                disabled={!allowSave}
                sx={{ m: 1, ml: 2, fontSize: 10 }}
                onClick={() => {
                  updateJsonFile(dataUrl, rows);
                }}
                size="small"
                color="success"
                startIcon={<Save sx={{ fontSize: 10 }} />}
              >
                Save
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            disabled={!allowSave}
            color="info"
            startIcon={<Add sx={{ fontSize: 10 }} />}
            onClick={addRecord}
            size="small"
            sx={{ m: 1, fontSize: 10 }}
          >
            Add
          </Button>
          <Button
            variant="contained"
            disabled={!allowSave}
            color="info"
            startIcon={<Delete sx={{ fontSize: 10 }} />}
            onClick={deleteRecord}
            size="small"
            sx={{ m: 1, fontSize: 10 }}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            disabled={!allowSave}
            color="info"
            startIcon={<FileCopy sx={{ fontSize: 10 }} />}
            onClick={duplicateRecord}
            size="small"
            sx={{ m: 1, fontSize: 10 }}
          >
            Duplicate
          </Button>
          <Tooltip title="View data from LSAF as a JSON file">
            <span>
              <Button
                variant="contained"
                color="info"
                startIcon={<Visibility sx={{ fontSize: 10 }} />}
                onClick={() => {
                  window
                    .open(`${fileViewerPrefix}${dataUrl}`, "_blank")
                    .focus();
                }}
                size="small"
                sx={{ m: 1, fontSize: 10 }}
              >
                Data
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="View metadata from LSAF as a JSON file">
            <span>
              <Button
                variant="contained"
                disabled={showMeta ? false : true}
                color="info"
                startIcon={<Wysiwyg sx={{ fontSize: 10 }} />}
                onClick={() => {
                  window
                    .open(`${fileViewerPrefix}${metaUrl}`, "_blank")
                    .focus();
                }}
                size="small"
                sx={{ m: 1, fontSize: 10 }}
              >
                Meta
              </Button>
            </span>
          </Tooltip>
          {key && availableKeys.length > 1 && (
            <Tooltip title="Choose a key" placement="right">
              <Select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                label="Key"
              >
                {availableKeys.map((k) => (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
          )}
          <Tooltip title="Smaller font">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setFontSize(fontSize - 1);
                localStorage.setItem("fontSize", fontSize - 1);
              }}
            >
              <Remove />
            </IconButton>
          </Tooltip>
          &nbsp;{fontSize}&nbsp;
          <Tooltip title="Larger font">
            <IconButton
              color="primary"
              size="small"
              onClick={() => {
                setFontSize(fontSize + 1);
                localStorage.setItem("fontSize", fontSize + 1);
              }}
            >
              <Add />
            </IconButton>
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
                {current} {key ? ` with key: ${key}` : ""}
              </span>
            ) : mode === "local" ? (
              "Running locally"
            ) : (
              ""
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Tooltip title="Load a backup">
            <IconButton
              color="info"
              // sx={{ mr: 2 }}
              onClick={() => {
                setShowBackups(true);
              }}
            >
              <CloudDownload />
            </IconButton>
          </Tooltip>
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
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {!checked ? (
            <DataGridPro
              columns={cols}
              rows={rows}
              // rowHeight={22}
              getRowHeight={() => "auto"}
              density="compact"
              // getRowId={(row) => row.__id__}
              // autoHeight
              pageSizeOptions={[25, 100, 1000]}
              pagination
              editMode="row"
              slots={{ columnMenu: CustomColumnMenu, toolbar: CustomToolbar }}
              sx={{
                width: window.innerWidth,
                height: window.innerHeight - 50,
                fontWeight: `fontSize=5`,
                fontSize: { fontSize },
                padding: 1,
                mt: 6,
              }}
              onCellEditStart={handleCellEditStart}
              onCellEditStop={handleCellEditStop}
              processRowUpdate={processRowUpdate}
              apiRef={apiRef}
              pinnedColumns={pinnedColumns}
              onPinnedColumnsChange={handlePinnedColumnsChange}
            />
          ) : (
            <Box sx={{ mt: 6 }}>
              <JSONTree data={rows} />
            </Box>
          )}
        </Grid>
      </Grid>

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
        onClose={() => setShowBackups(false)}
        open={showBackups}
      >
        <DialogTitle>Load a backup</DialogTitle>
        <DialogContent>
          {backups.map((b, i) => (
            <Chip
              sx={{
                m: 0.5,
                backgroundColor: i % 2 === 0 ? "lightblue" : "lightgreen",
              }}
              key={"chip" + i}
              label={b}
              onClick={() => loadBackup(b)}
            />
          ))}
        </DialogContent>
      </Dialog>
      {/* Dialog with General info about this screen */}
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenInfo(false)}
        open={openInfo}
      >
        <DialogTitle>Info about this screen</DialogTitle>
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
              Press <b>escape</b> or click away to cancel editing the row.
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
            <li>
              Each time you save, it makes a backup of the data in your
              browsers's local storage. So if disaster happens, you can get a
              previous version of the data.
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
              <Link
                href={
                  "https://" +
                  host +
                  "/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/test2.json"
                }
              >
                View a JSON file, without metadata and therefore treating all
                fields as strings
              </Link>
            </li>
            <li>
              <Link
                href={
                  "https://" +
                  host +
                  "/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/test2.json&meta=/general/biostat/tools/view/test2-metadata.json"
                }
              >
                View a JSON file, using metadata to define the columns
              </Link>
            </li>
            <li>
              <Link
                href={
                  "https://" +
                  host +
                  "/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/tools/view/data%20wtih%20keys.json&key=a"
                }
              >
                View a JSON file which has multiple tables with keys, specifying
                a key for which table you want to view
              </Link>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default App;
