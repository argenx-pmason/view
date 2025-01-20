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
  // TextField,
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
import { usePapaParse } from "react-papaparse";
import MenuIcon from "@mui/icons-material/Menu";
import "./App.css";
import localData from "./data.json";
import localMeta from "./metadata.json";
import localInfo from "./info.json";
import links from "./links.json";
// apply the license for data grid
LicenseInfo.setLicenseKey(
  "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
);
function App() {
  const apiRef = useGridApiRef(),
    { readString } = usePapaParse(),
    keepBackups = 20, // keep this many backups of data, which are saved each time you open the data in the app
    { href, host } = window.location, // get the URL so we can work out where we are running
    mode = href.startsWith("http://localhost") ? "local" : "remote",
    lsafType =
      href.includes("/webdav/work") || href.includes("/filedownload/work")
        ? "work"
        : "repo",
    webDavPrefix = "https://" + host + "/lsaf/webdav/" + lsafType, // prefix for webdav access to LSAF
    fileViewerPrefix =
      "https://" +
      host +
      "/lsaf/filedownload/sdd:/general/biostat/apps/fileviewer/index.html?file=",
    // logViewerPrefix =
    //   "https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/apps/logviewer/index.html?log=",
    logViewerPrefix =
      "https://" +
      host +
      "/lsaf/filedownload/sdd:/general/biostat/apps/logviewer/index.html?log=",
    params = new URLSearchParams(document.location.search),
    handleClickMenu = (event) => {
      setAnchorEl(event.currentTarget);
    },
    handleCloseMenu = () => {
      setAnchorEl(null);
    },
    [pinnedColumns, setPinnedColumns] = useState({ left: [] }),
    [globalMeta, setGlobalMeta] = useState({}),
    [globalFilters, setGlobalFilters] = useState([]),
    tempGlobalFilters = [],
    handlePinnedColumnsChange = useCallback((updatedPinnedColumns) => {
      setPinnedColumns(updatedPinnedColumns);
    }, []),
    [hiddenColumns, setHiddenColumns] = useState([]),
    [hiddenColumnsObject, setHiddenColumnsObject] = useState({}),
    [timestampsToDo, setTimestampsToDo] = useState([]),
    // [uniqueValues, setUniqueValues] = useState([]),
    [datefilters, setDatefilters] = useState(null),
    [availableKeys, setAvailableKeys] = useState([]),
    [showBackups, setShowBackups] = useState(false),
    [openSnackbar, setOpenSnackbar] = useState(false),
    [isArray, setIsArray] = useState(false),
    [quickFilterValues, setQuickFilterValues] = useState(null),
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
    [infoUrl, setInfoUrl] = useState(null),
    [backups, setBackups] = useState([]),
    [checked, setChecked] = useState(false),
    [infoHtml, setInfoHtml] = useState(null),
    [originalData, setOriginalData] = useState([]),
    [contextMenu, setContextMenu] = useState(null),
    [selectedValue, setSelectedValue] = useState(null),
    [selectedField, setSelectedField] = useState(null),
    handleContextMenu = (event) => {
      event.preventDefault();
      const { target } = event,
        value = target.innerText,
        parent = target.parentNode,
        field = target.getAttribute("data-field")
          ? target.getAttribute("data-field")
          : parent.getAttribute("data-field");
      console.log(event, target, target.dataset, field, value, parent);
      setSelectedValue(value);
      setSelectedField(field);
      setContextMenu(
        contextMenu === null
          ? {
              mouseX: event.clientX + 2,
              mouseY: event.clientY - 6,
            }
          : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
            // Other native context menus might behave different.
            // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
            null
      );
    },
    handleClose = () => {
      setContextMenu(null);
    },
    getType = (v) => {
      if (mode === "local") {
        console.log("localMeta", localMeta);
        return localMeta?.[v]?.type;
      } else if (mode === "remote") {
        console.log("globalMeta", globalMeta);
        return globalMeta?.[v]?.type;
      } else {
        return "string";
      }
    },
    handleSet = () => {
      setContextMenu(null);
      console.log("set", selectedField, selectedValue);
      let type = getType(selectedField),
        id = 0;
      apiRef.current.upsertFilterItems([]);
      apiRef.current.upsertFilterItems([
        {
          field: selectedField,
          operator: ["date", "datetime", "singleSelect"].includes(type)
            ? "is"
            : "equals",
          value: selectedValue,
          id: id,
        },
      ]);
    },
    handleAdd = () => {
      setContextMenu(null);
      console.log("add", selectedField, selectedValue);
      let type = getType(selectedField),
        whatWeHave = apiRef.current.store.value.filter.filterModel.items,
        id = whatWeHave.length;
      console.log("id", id, "whatWeHave", whatWeHave);
      apiRef.current.upsertFilterItems([
        ...whatWeHave,
        {
          field: selectedField,
          operator: ["date", "datetime", "singleSelect"].includes(type)
            ? "is"
            : "equals",
          value: selectedValue,
          id: id,
        },
      ]);
    },
    handleClear = () => {
      setContextMenu(null);
      apiRef.current.upsertFilterItems([]);
    },
    // handleSave = () => {
    //   setContextMenu(null);
    // },
    // handleLoad = () => {
    //   setContextMenu(null);
    // },
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
          {globalFilters.length > 0 &&
            globalFilters.map((uv, uvn) => {
              return Array.from(uv.values).map((u) => {
                return (
                  <Button
                    color={
                      uvn === 0
                        ? "success"
                        : uvn === 0
                        ? "warning"
                        : uvn === 1
                        ? "secondary"
                        : uvn === 2
                        ? "error"
                        : "info"
                    }
                    variant="outlined"
                    size="small"
                    key={"key-" + u}
                    sx={{ fontSize: 10, fontWeight: "bold", minWidth: 10 }}
                    onClick={(e, id) => {
                      apiRef.current.upsertFilterItems([
                        {
                          field: uv.key,
                          operator:
                            ["date", "datetime", "singleSelect"].includes(
                              uv.type
                            ) && !e.ctrlKey
                              ? "is"
                              : ["date", "datetime", "singleSelect"].includes(
                                  uv.type
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
              });
            })}

          {datefilters &&
            Array.from(Object.keys(datefilters)).map((df, id) => {
              const u = datefilters[df],
                k = Object.keys(u)[0],
                v = u[k];
              // op = k === "lt" ? "is before" : k === "gt" ? "is after" : k;
              // console.log("df", df, "u", u, "k", k, "v", v, "op", op);
              return (
                <Button
                  color="warning"
                  variant="contained"
                  size="small"
                  key={"key-" + id}
                  sx={{ fontSize: 10, fontWeight: "bold", minWidth: 10 }}
                  onClick={(e, id) => {
                    console.log(
                      apiRef,
                      apiRef.current.state,
                      apiRef.current.store
                    );
                    const currentFilter =
                      apiRef.current.state.filter.filterModel.items;
                    let today = new Date();
                    let operator = "is";
                    if (k === "lt" && !e.ctrlKey) {
                      operator = "before";
                      today.setDate(today.getDate() + v);
                    } else if (k === "lt" && e.ctrlKey) {
                      operator = "after";
                      today.setDate(today.getDate() - v);
                    }
                    let compareValue = today.toISOString().slice(0, 10),
                      newFilter = [
                        ...currentFilter,
                        {
                          field: df,
                          operator: operator,
                          value: compareValue,
                          id: id,
                        },
                      ];

                    console.log(
                      "operator",
                      operator,
                      "today",
                      today,
                      "compareValue",
                      compareValue,
                      "newFilter",
                      newFilter
                    );
                    apiRef.current.upsertFilterItems(newFilter);
                  }}
                >
                  {k ? df + " " + k + " " + v : "blank"}
                </Button>
              );
            })}

          {(datefilters || globalFilters.length > 0) && (
            <Button
              color="info"
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
      console.log(
        "updateJsonFile - file:",
        file,
        "content:",
        content,
        "timestampsToDo",
        timestampsToDo
      );
      if (!file || !content) return;

      // TODO: add timestamps for things we are monitoring that have changed
      // compare original content to new content
      // if different in a varChanged from timestampsToDo then add a timestamp to the new content in the varTimestamp field

      // drop id from each row in content
      const contentWithoutId = content.map((c) => {
        delete c.id;
        return c;
      });
      let tempContent;
      // handle inserting table into the right place in keyed object
      if (key) {
        originalData[key] = contentWithoutId;
        tempContent = JSON.stringify(originalData);
        console.log("originalData - with changed table inserted", originalData);
      } else {
        tempContent = JSON.stringify(contentWithoutId);
      }
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
              // add the id back
              setRows(content.map((d, i) => ({ ...d, id: uuidv4() })));
              setMessage(response.ok ? "File saved" : "File not saved");
              setOpenSnackbar(true);
              response.text().then(function (text) {
                console.log("text", text);
              });
            })
            .catch((err) => {
              // add the id back
              setRows(content.map((d, i) => ({ ...d, id: uuidv4() })));
              setMessage(err);
              setOpenSnackbar(true);
              console.log("PUT err: ", err);
            });
        })
        .catch((err) => {
          // add the id back
          setRows(content.map((d, i) => ({ ...d, id: uuidv4() })));
          setMessage(
            "DELETE was attempted before the new version was saved - but the DELETE failed. (see console)"
          );
          setOpenSnackbar(true);
          console.log("DELETE err: ", err);
        });
    },
    [showMeta, setShowMeta] = useState(false),
    [allowSave, setAllowSave] = useState(true),
    addRecord = (e) => {
      const id = uuidv4();
      let newRow = { id: id };
      if (rows.length > 0) {
        const row0 = rows[0];
        Object.keys(row0).forEach((index) => {
          newRow[index] = ".";
        });
        newRow.id = id;
      }
      setRows([...rows, newRow]);
    },
    deleteRecord = (e) => {
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
      const tempRows = [...rows, ...extraRows];
      console.log("tempRows", tempRows);
      setRows(tempRows);
    },
    sortDataAndSetRows = (ddd, mmm, iii) => {
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
      setRows(ddd.map((d, i) => ({ ...d, id: uuidv4() }))); // add an id field to each row
      if (iii && iii.length > 0) setInfoHtml(iii.join(" "));
    },
    loadBackup = (b) => {
      setShowBackups(false);
      const loadedText1 = decodeURIComponent(
        localStorage.getItem(b).replace(/\\/g, "")
      );
      console.log("loadedText1", loadedText1);
      //if string starts with quote then strip first and last characters from string
      const loadedText2 = loadedText1.startsWith('"')
        ? loadedText1.slice(1, -1)
        : loadedText1;
      console.log("loadedText2", loadedText2);
      const tempRows = JSON.parse(loadedText2).map((r) => ({
        ...r,
        id: uuidv4(),
      }));
      console.log("loading backup -> ", b, "tempRows", tempRows);
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
    [lastModified, setLastModified] = useState(null),
    getData = async (d, m, i, k) => {
      console.log("getData", "d", d, "m", m, "i", i, "k", k);
      const dUrl = `${webDavPrefix}${d}`,
        mUrl = `${webDavPrefix}${m}`,
        iUrl = `${webDavPrefix}${i}`,
        tempDatefilters = {};
      console.log("dUrl", dUrl, "mUrl", mUrl, "iUrl", iUrl);
      let metaData = {};
      if (m) {
        const res = await fetch(mUrl);
        metaData = await res.json();
      }
      let info = {};
      if (i) {
        const res = await fetch(iUrl);
        info = await res.json();
      }
      fetch(dUrl)
        .then((res) => {
          const lastModified = res.headers.get("Last-Modified");
          setLastModified(lastModified);
          // if the file was a CSV file, then we can use papaparse to parse the CSV into JSON
          if (d.endsWith(".csv")) {
            return res.text();
          } else return res.json();
        })
        .then((data) => {
          if (d.endsWith(".csv")) {
            const parsed = readString(data, { header: true });
            console.log("parsed", parsed);
            processData(parsed.data, k, metaData, info, tempDatefilters);
          } else processData(data, k, metaData, info, tempDatefilters);
        });
      console.log("tempDatefilters", tempDatefilters);
      setDatefilters(tempDatefilters);
    },
    processData = (data, k, metaData, info, tempDatefilters) => {
      setOriginalData(data);
      const tempAvailableKeys = Object.keys(data),
        isObject =
          typeof data === "object" && !Array.isArray(data) && data !== null;
      setAvailableKeys(tempAvailableKeys);
      if (tempAvailableKeys.length > 0 && !key) {
        if (isObject) {
          // check each key to see if it is an array, and then use that
          for (let i = 0; i < tempAvailableKeys.length; i++) {
            const tempK = tempAvailableKeys[i];
            if (data[tempK].constructor === Array) {
              k = tempAvailableKeys[i];
            }
          }
        }
        setKey(k);
      }
      let data2use = data;
      if (k) {
        data2use = data[k];
      }

      const ia = Array.isArray(data2use);
      console.log(
        "ia",
        ia,
        "data2use",
        data2use,
        "key",
        k,
        "metaData",
        metaData,
        "info",
        info
      );
      setIsArray(ia);
      if (!ia || data2use.length === 0) return;
      setGlobalMeta(metaData);

      // TODO: check if the data is an array of objects, if not, make it so
      sortDataAndSetRows(data2use, metaData, info);
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
      dataKeys.forEach((k) => {
        const tempHiddenColumns = hiddenColumns;
        if (metaData[k]?.hide) {
          tempHiddenColumns.push(k);
        }
        setHiddenColumns(tempHiddenColumns);
        const tempHiddenColumnsObject = {};
        tempHiddenColumns.forEach((c) => (tempHiddenColumnsObject[c] = false));
        setHiddenColumnsObject(tempHiddenColumnsObject);
      });
      setCols(
        combinedKeys.map((k) => {
          let headerName = k,
            type = "string",
            valueOptions = null,
            width = null,
            link = false,
            linkvar = null,
            log = false,
            logverKeyToUse = null,
            file = false,
            fileverKeyToUse = null,
            short = null,
            heatmap = null,
            heatmapRange = null,
            heatmapAge = null,
            heatmapCondition = null,
            filter = null,
            datefilter = null,
            pin = null,
            tooltip = null,
            description = null,
            multiline = false;
          if (metaData[k]) {
            headerName = metaData[k].label;
            type = metaData[k].type;
            valueOptions = metaData[k].valueOptions;
            width = metaData[k].width;
            link = metaData[k].link;
            linkvar = metaData[k].linkvar;
            log = metaData[k]?.log;
            logverKeyToUse = metaData[k]?.logver;
            file = metaData[k]?.file;
            fileverKeyToUse = metaData[k]?.filever;
            short = metaData[k]?.short;
            heatmap = metaData[k]?.heatmap;
            heatmapRange = metaData[k]?.heatmapRange;
            heatmapAge = metaData[k]["heatmap_age"];
            heatmapCondition = metaData[k]?.heatmapCondition;
            filter = metaData[k]?.filter;
            datefilter = metaData[k]?.datefilter;
            pin = metaData[k]?.pin;
            tooltip = metaData[k]?.tooltip;
            description = metaData[k]?.description;
            multiline = metaData[k]?.multiline;
          }

          let valueGetter = null;
          if (type === "date" || type === "dateTime") {
            valueGetter = (row) => {
              return row && new Date(row.value);
            };
          }
          let renderCell = null;
          if (tooltip) {
            renderCell = (params) => {
              const { row } = params,
                tt = row[tooltip];
              return <Tooltip title={tt}>{params.value}</Tooltip>;
            };
          }

          if (log || file || link) {
            renderCell = (params) => {
              const { row } = params;
              let tt = "";
              if ("tooltip" in row) tt = row[tooltip];
              else tt = params.value;
              const logver = row[logverKeyToUse]
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
                    : params.value > " " && link && linkvar
                    ? params.value.replace("{{linkvar}}", row[linkvar])
                    : params.value > " " && link
                    ? params.value
                    : null;
              console.log(
                "url",
                url,
                "params.value",
                params.value,
                "link",
                link,
                "linkvar",
                linkvar
              );
              if (typeof url === "string" && url.startsWith("http")) {
                return (
                  <Tooltip title={tt}>
                    <Link href={url} target="_blank" rel="noreferrer">
                      {short || params.value}
                    </Link>
                  </Tooltip>
                );
              } else return "n/a";
            };
          } else if (heatmap) {
            renderCell = (params) => {
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  console.log("heatmapCondition[key]", heatmapCondition[key]);
                  const things = Object.keys(heatmapCondition[key]);
                  console.log("things", things);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    console.log(
                      "key",
                      key,
                      "operator",
                      operator,
                      "thingValue",
                      thingValue,
                      "row[key]",
                      row[key]
                    );
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              const color = applyHeatmap
                ? heatmap[params.value] || "white"
                : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {params.value}
                </Box>
              );
            };
          } else if (heatmapRange) {
            renderCell = (params) => {
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                console.log("===>");
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  console.log("heatmapCondition[key]", heatmapCondition[key]);
                  const things = Object.keys(heatmapCondition[key]);
                  console.log("things", things);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    console.log(
                      "key",
                      key,
                      "operator",
                      operator,
                      "thingValue",
                      thingValue,
                      "row[key]",
                      row[key]
                    );
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              let colorR = null;
              for (const element of heatmapRange) {
                const from = element?.from,
                  to = element?.to,
                  rangeColor = element?.color;
                if (from && to) {
                  if (params.value >= from && params.value <= to)
                    colorR = rangeColor;
                } else if (from && !to) {
                  if (params.value >= from) colorR = rangeColor;
                } else if (!from && to) {
                  if (params.value <= to) colorR = rangeColor;
                }
              }
              const color = applyHeatmap ? colorR || "white" : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {params.value}
                </Box>
              );
            };
          } else if (heatmapAge) {
            renderCell = (params) => {
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                console.log("===>");
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  console.log("heatmapCondition[key]", heatmapCondition[key]);
                  const things = Object.keys(heatmapCondition[key]);
                  console.log("things", things);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    console.log(
                      "key",
                      key,
                      "operator",
                      operator,
                      "thingValue",
                      thingValue,
                      "row[key]",
                      row[key]
                    );
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              console.log("params", params);
              let colorR = null,
                age = null,
                dateText = params.value
                  ? params.value.toLocaleDateString()
                  : null;
              if (params.value) {
                const then = new Date(params.value),
                  now = new Date(),
                  diffTime = Math.abs(then - now);
                age = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              for (const element of heatmapAge) {
                const from = element?.from,
                  to = element?.to,
                  rangeColor = element?.color;
                if (from && to) {
                  if (age >= from && age <= to) colorR = rangeColor;
                } else if (from && !to) {
                  if (age >= from) colorR = rangeColor;
                } else if (!from && to) {
                  if (age <= to) colorR = rangeColor;
                }
              }
              const color = applyHeatmap ? colorR || "white" : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {dateText}
                </Box>
              );
            };
          }
          if (filter) {
            const tempUniqueValues = Array.from(
              new Set(data2use.map((row) => row[k]))
            ).filter((v) => v !== undefined);
            if (typeof tempUniqueValues[0] === "string")
              tempUniqueValues.sort((a, b) => a.localeCompare(b));
            if (tempGlobalFilters.filter((r) => r.key === k).length === 0)
              tempGlobalFilters.push({
                key: k,
                type: type,
                values: tempUniqueValues,
              });
            console.log(
              "tempUniqueValues",
              tempUniqueValues,
              "tempGlobalFilters",
              tempGlobalFilters
            );
            setGlobalFilters(tempGlobalFilters);
          }
          if (datefilter) {
            tempDatefilters[k] = datefilter;
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
            description: description,
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
              description: description,
              ...multilineColumn,
            };
          }
          return columnDefinition;
        })
      );
    },
    handleLocal = () => {
      console.log(
        "localData",
        localData,
        "localMeta",
        localMeta,
        "localInfo",
        localInfo
      );
      const tempAvailableKeys = Object.keys(localData),
        isObject =
          typeof localData === "object" &&
          !Array.isArray(localData) &&
          localData !== null,
        tempDatefilters = {};
      setAvailableKeys(tempAvailableKeys);
      let useData = localData,
        k = null;
      if (tempAvailableKeys.length > 0 && !key) {
        if (isObject) {
          // check each key to see if it is an array, and then use that
          for (let i = 0; i < tempAvailableKeys.length; i++) {
            const tempK = tempAvailableKeys[i];
            if (localData[tempK].constructor === Array) {
              k = tempAvailableKeys[i];
            }
          }
        }
        setKey(k);
        if (k) useData = localData[k];
      } else if (tempAvailableKeys.length > 0) {
        useData = localData[key];
      }
      const ia = Array.isArray(useData);
      setIsArray(ia);
      console.log("ia", ia);
      if (!ia) return;

      sortDataAndSetRows(useData, localMeta, localInfo);

      backup(useData);
      const metaKeys = Object.keys(localMeta),
        dataKeys = Object.keys(useData[0]),
        combinedKeys = metaKeys
          .concat(dataKeys.filter((item) => metaKeys.indexOf(item) < 0))
          .filter((k) => k.startsWith("#") === false);
      let pins = [];
      // handle the special metadata with keys that start with #
      // #viewonly - if this key is present, then the user cannot save the data back to the server
      metaKeys.forEach((k) => {
        if (k === "#viewonly") setAllowSave(false);
      });
      dataKeys.forEach((k) => {
        // console.log("dataKeys", dataKeys, "localMeta[k]", localMeta[k]);
        // handle hidden columns
        const tempHiddenColumns = hiddenColumns;
        if (localMeta[k]?.hide) {
          tempHiddenColumns.push(k);
        }
        setHiddenColumns(tempHiddenColumns);
        const tempHiddenColumnsObject = {};
        tempHiddenColumns.forEach((c) => (tempHiddenColumnsObject[c] = false));
        setHiddenColumnsObject(tempHiddenColumnsObject);
      });
      dataKeys.forEach((k) => {
        // console.log("dataKeys", dataKeys, "localMeta[k]", localMeta[k]);
        // handle timestamps
        const tempTimestampsToDo = [...timestampsToDo],
          timestampVar = localMeta[k]?.timestamp;
        if (localMeta[k]?.timestamp) {
          const temp = { varChanged: k, varTimestamp: timestampVar };
          tempTimestampsToDo.push(temp);
          console.log("tempTimestampsToDo", tempTimestampsToDo);
          setTimestampsToDo(tempTimestampsToDo);
        }
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
            link = false,
            linkvar = null,
            short = null,
            heatmap = null,
            heatmapRange = null,
            heatmapAge = null,
            heatmapCondition = null,
            filter = null,
            datefilter = null,
            pin = null,
            tooltip = null,
            description = null,
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
            link = localMeta[k].link;
            linkvar = localMeta[k].linkvar;
            short = localMeta[k].short;
            heatmap = localMeta[k].heatmap;
            heatmapRange = localMeta[k].heatmapRange;
            heatmapAge = localMeta[k]["heatmap_age"];
            heatmapCondition = localMeta[k].heatmapCondition;
            filter = localMeta[k].filter;
            datefilter = localMeta[k].datefilter;
            pin = localMeta[k].pin;
            tooltip = localMeta[k].tooltip;
            description = localMeta[k].description;
            multiline = localMeta[k].multiline;
          }
          let valueGetter = null;
          if (type === "date" || type === "dateTime") {
            valueGetter = (row) => {
              return row && new Date(row.value);
            };
          }
          let renderCell = null;
          if (tooltip) {
            renderCell = (params) => {
              const { row } = params,
                tt = row[tooltip];
              return <Tooltip title={tt}>{params.value}</Tooltip>;
            };
          }
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
                    : params.value > " " && link && linkvar
                    ? link.replace("{{linkvar}}", row[linkvar])
                    : params.value > " " && link
                    ? link
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
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  const things = Object.keys(heatmapCondition[key]);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              const color = applyHeatmap
                ? heatmap[params.value] || "white"
                : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {params.value}
                </Box>
              );
            };
          }
          // if (timestamp) {
          //   renderCell = (params) => {
          //     const { row } = params,
          //       checkField = row[timestamp];
          //     return (
          //       <TextField
          //         size="small"
          //         value={params.value}
          //         onChange={(e) => {
          //           console.log("change", e);
          //         }}
          //         onKeyDown={(e) => {
          //           console.log(
          //             "e",
          //             e,
          //             e.target.value,
          //             "row",
          //             row,
          //             "timestamp",
          //             timestamp,
          //             "checkField",
          //             checkField
          //           );
          //           const d = new Date();
          //           row[k] = e.target.value;
          //           row[timestamp] = d.toISOString();
          //         }}
          //       >
          //         {params.value}
          //       </TextField>
          //     );
          //   };
          // }
          if (heatmapRange) {
            renderCell = (params) => {
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  const things = Object.keys(heatmapCondition[key]);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              let colorR = null;
              for (const element of heatmapRange) {
                const from = element?.from,
                  to = element?.to,
                  rangeColor = element?.color;
                if (from && to) {
                  if (params.value >= from && params.value <= to)
                    colorR = rangeColor;
                } else if (from && !to) {
                  if (params.value >= from) colorR = rangeColor;
                } else if (!from && to) {
                  if (params.value <= to) colorR = rangeColor;
                }
              }
              const color = applyHeatmap ? colorR || "white" : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {params.value}
                </Box>
              );
            };
          } else if (heatmapAge) {
            renderCell = (params) => {
              const { row } = params;
              let applyHeatmap = true;
              if (
                heatmapCondition &&
                Object.keys(heatmapCondition).length > 0
              ) {
                console.log("===>");
                const heatKeys = Object.keys(heatmapCondition);
                for (const key of heatKeys) {
                  console.log("heatmapCondition[key]", heatmapCondition[key]);
                  const things = Object.keys(heatmapCondition[key]);
                  console.log("things", things);
                  for (const operator of things) {
                    const thingValue = heatmapCondition[key][operator];
                    console.log(
                      "key",
                      key,
                      "operator",
                      operator,
                      "thingValue",
                      thingValue,
                      "row[key]",
                      row[key]
                    );
                    if (operator === "NE" && row[key] === thingValue)
                      applyHeatmap = false;
                    if (operator === "EQ" && row[key] !== thingValue)
                      applyHeatmap = false;
                  }
                }
              }
              let colorR = null,
                age = null,
                dateText = params.value
                  ? params.value.toLocaleDateString()
                  : null;
              if (params.value) {
                const then = new Date(params.value),
                  now = new Date(),
                  diffTime = Math.abs(then - now);
                age = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              console.log(params.value, age, dateText);
              for (const element of heatmapAge) {
                const from = element?.from,
                  to = element?.to,
                  rangeColor = element?.color;
                if (from && to) {
                  if (age >= from && age <= to) colorR = rangeColor;
                } else if (from && !to) {
                  if (age >= from) colorR = rangeColor;
                } else if (!from && to) {
                  if (age <= to) colorR = rangeColor;
                }
              }
              const color = applyHeatmap ? colorR || "white" : null;
              return (
                <Box sx={{ backgroundColor: color, flexGrow: 1 }}>
                  {dateText}
                </Box>
              );
            };
          }
          if (filter) {
            const tempUniqueValues = Array.from(
              new Set(useData.map((row) => row[k]))
            ).filter((v) => v !== undefined);
            if (typeof tempUniqueValues[0] === "string")
              tempUniqueValues.sort((a, b) => a.localeCompare(b));
            if (tempGlobalFilters.filter((r) => r.key === k).length === 0)
              tempGlobalFilters.push({
                key: k,
                type: type,
                values: tempUniqueValues,
              });
            console.log(
              "tempUniqueValues",
              tempUniqueValues,
              "tempGlobalFilters",
              tempGlobalFilters
            );
            setGlobalFilters(tempGlobalFilters);
          }
          if (datefilter) {
            tempDatefilters[k] = datefilter;
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
            description: description,
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
              description: description,
              ...multilineColumn,
            };
          }
          return columnDefinition;
        })
      );
      setDataUrl(
        "https://" +
          host +
          "/lsaf/webdav/" +
          lsafType +
          "/general/biostat/jobs/dashboard/dev/output/sapxlsx/sap_updates.json"
      );
      console.log("tempDatefilters", tempDatefilters);
      setDatefilters(tempDatefilters);
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
      console.log(
        "split",
        split,
        "parms",
        parms,
        "parsed",
        parsed,
        "metaUrl",
        metaUrl,
        "infoUrl",
        infoUrl
      );
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
      if (!key && "key" in parsed) {
        setKey(parsed.key);
        setAllowSave(false);
      } else {
        setAllowSave(true);
      }
      if (!metaUrl && "meta" in parsed) {
        setMetaUrl(parsed.meta);
        url = `${webDavPrefix}${parsed.meta}`;
        setMetaUrl(url);
        setShowMeta(true);
      } else if (!("meta" in parsed)) {
        setShowMeta(false);
      }
      if (!infoUrl && "info" in parsed) {
        setInfoUrl(parsed.info);
        url = `${webDavPrefix}${parsed.info}`;
        setInfoUrl(url);
      }
      // if readonly is true or 1, then we dont allow saving
      if ("readonly" in parsed) {
        const tempAllowSave =
          parsed.readonly === "1" || parsed.readonly === "true" ? false : true;
        console.log("tempAllowSave", tempAllowSave);
        setAllowSave(tempAllowSave);
      }
      if ("filter" in parsed) {
        const tempQf = [params.get("filter")];
        setQuickFilterValues(tempQf);
        console.log("tempQf", tempQf);
        setQuickFilterValues(tempQf);
      }
      // use the key from the URL if it is there, otherwise use the key selected by user
      let useKey = parsed.key;
      if (key) useKey = key;
      getData(parsed.lsaf, parsed.meta, parsed.info, useKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, mode, key]);

  useEffect(() => {
    if (!isArray) setChecked(true);
    else setChecked(false);
  }, [isArray]);

  return (
    <div className="App">
      <AppBar position="fixed">
        <Toolbar variant="dense" sx={{ backgroundColor: "#f7f7f7" }}>
          <Tooltip title="Menu">
            <IconButton
              edge="start"
              color="info"
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
              border: 1,
              borderRadius: 2,
              color: "black",
              fontWeight: "bold",
              boxShadow: 3,
              fontSize: 14,
              height: 23,
              padding: 0.3,
            }}
          >
            &nbsp;&nbsp;{title}&nbsp;&nbsp;
          </Box>
          <Tooltip title="Switch between editor and JSON views">
            <Switch
              checked={checked}
              onChange={() => {
                setChecked(!checked);
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          </Tooltip>
          <Tooltip title="Save JSON back to server">
            <span>
              <Button
                variant="contained"
                // disabled={!allowSave}
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
          <Box sx={{ color: "#0288d1" }}>&nbsp;{fontSize}&nbsp;</Box>
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
          <Tooltip title={lastModified || "Data comes from this file"}>
            <Box
              sx={{
                color: "#0288d1",
                backgroundColor: "#cdcdcd",
                fontWeight: "bold",
                // fontSize: "0.8em",
                textAlign: "left",
                border: 1,
                borderRadius: 2,
                // color: "black",
                boxShadow: 3,
                fontSize: 14,
                height: 23,
                padding: 0.3,
              }}
            >
              &nbsp;
              {current ? (
                <span>
                  {current} {key ? ` with key: ${key}` : ""}
                </span>
              ) : mode === "local" ? (
                "Running locally"
              ) : (
                ""
              )}
              &nbsp;
            </Box>
          </Tooltip>
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
            // <Box onContextMenu={handleContextMenu}>
            <DataGridPro
              columns={cols}
              rows={rows}
              // rowHeight={22}
              getRowHeight={() => "auto"}
              density="compact"
              // getRowId={(row) => row.__id__}
              // autoHeight
              pageSizeOptions={[25, 100, 1000, 10000]}
              pagination
              editMode="row"
              slots={{ columnMenu: CustomColumnMenu, toolbar: CustomToolbar }}
              slotProps={{
                row: {
                  onContextMenu: (e) => handleContextMenu(e),
                  style: { cursor: "context-menu" },
                },
              }}
              sx={{
                // width: window.innerWidth,
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
              initialState={{
                columns: {
                  columnVisibilityModel: hiddenColumnsObject,
                },
                filter: {
                  filterModel: {
                    items: [],
                    quickFilterValues: quickFilterValues,
                  },
                },
              }}
            />
          ) : (
            // </Box>
            <Box sx={{ mt: 8 }}>
              <pre>
                {mode === "local"
                  ? JSON.stringify(localData, null, "\t")
                  : mode === "remote"
                  ? JSON.stringify(originalData, null, "\t")
                  : "No text to display."}
              </pre>
            </Box>
          )}
        </Grid>
      </Grid>

      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleSet}>Set</MenuItem>
        <MenuItem onClick={handleAdd}>Add</MenuItem>
        <MenuItem onClick={handleClear}>Clear</MenuItem>
        {/* <MenuItem onClick={handleSave}>Save</MenuItem>
        <MenuItem onClick={handleLoad}>Load</MenuItem> */}
      </Menu>

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
        <DialogTitle>
          Info about this screen{" "}
          <Link
            variant="inherit"
            sx={{ display: "flex", justifyContent: "right" }}
            href={
              "https://argenxbvba.sharepoint.com/:w:/r/sites/Biostatistics/_layouts/15/Doc.aspx?sourcedoc=%7BB2358A9E-83A1-47DE-91FB-FD5C3C2CA62D%7D&file=View%20(web%20app).docx&action=default&mobileredirect=true"
            }
            target="_blank"
            rel="noopener"
          >
            Open User Guide
          </Link>
        </DialogTitle>
        <DialogContent>
          {infoHtml && <div dangerouslySetInnerHTML={{ __html: infoHtml }} />}
          <h1>General Info</h1>
          <Box sx={{ color: "blue", fontSize: 11 }}>
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
              <b>info</b> - location of JSON file with HTML to use containing
              information about the data in this view
            </li>
            <li>
              <b>key</b> - the key of the JSON file to load
            </li>
            <li>
              <b>filter</b> - specifies some text to use in the quick filter
            </li>
            <li>
              <b>readonly</b> - Y means that file can't be saved
            </li>
          </ul>
          <b>Sample uses</b>
          <ul>
            <li>
              <Link
                href={
                  "https://" +
                  host +
                  "/lsaf/filedownload/sdd%3A///general/biostat/apps/view/index.html?lsaf=/general/biostat/apps/view/test2.json"
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
                  "/lsaf/filedownload/sdd%3A///general/biostat/apps/view/index.html?lsaf=/general/biostat/apps/view/test2.json&meta=/general/biostat/apps/view/test2-metadata.json"
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
                  "/lsaf/filedownload/sdd%3A///general/biostat/apps/view/index.html?lsaf=/general/biostat/apps/view/data%20wtih%20keys.json&key=a"
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
