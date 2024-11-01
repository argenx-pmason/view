# Functional Specifications - macro [view.sas](../../../_library/view.sas)

## Author

Phil Mason

## Date

2024-09-04

## Run Environments

- SAS LSAF \>= 5.4.1
  - Hosts:
    - Development: xartest.ondemand.sas.com
    - Validation: xarval.ondemand.sas.com
    - Production: xarprod.ondemand.sas.com
  - Run Locations:
    - Workspace (interactive/job)
    - Repository job (transient folder)

## Location

/general/biostat/macros/\_library/[getfilesize.sas](../../../_library/lsaf_restapi_logon.sas)

## Functional Specifications

1. Write to log the macro call that was used along with parameter values
2. Check validity of parameters as best we can, and show errors/warnings
3. Retrieve values of some variables from environment variables and validate
   1. &lsaf_host._basicauth
   2. &lsaf_host._userid
   3. &lsaf_host._encpasswd
4. if there is no encoded password, then call API to encode password
   1. use api/encrypt
   2. if response status = 200 then it worked
      1. Extract the encoded password
      2. store it in macro and environment variable
5. if we are missing key data like encoded_password then abort
6. Logon using the api/logon
   1. if response status = 200 then it worked
   2. write the response to the log
7. optionally store things in environment variables &/or global macro variables
   1. authentication token
   2. encrypted password
   3. basic authentication

## Macro Parameters

- [SharePoint documentation](https://argenxbvba.sharepoint.com/sites/Biostatistics/Programming%20documentation/latest/df/d01/lsaf__restapi__logon_8sas.aspx)

- SASUnit documentation

  - [local](../../en/doc/pgmDoc/02_lsaf_restapi_logon.html)
  - [workspace](../../en-workspace/doc/pgmDoc/02_lsaf_restapi_logon.html)
  - [repository](../../en-repository/doc/pgmDoc/02_lsaf_restapi_logon.html)

- [program header](../../../_library/lsaf_restapi_logon.sas)
