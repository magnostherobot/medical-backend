# What We Should Do

## Key:
- *Italics* are for optional tasks.
- Tasks without checkboxes are continuous.
- Completed task checkboxes should be filled with the letters:
    Calum    - C
    Hafeez   - H
    Johannes - J
    Josh     - L
    Tom      - T

## Plan and organise
- [ ] Database Design
- [ ] Server Design
-     Stand up Meetings and the shit like that (forgot the name for that)

## Create a Database for Storing Project Resources
- [ ] Storing Data
  - [ ] Tabular Data
  - [ ] Image Data
  - [ ] *Plain text*
  - [ ] *Other Binary Data*
- [ ] Fetching Data
- [ ] Filetype Conversion
  - [ ] Take In `.czi` (*Zeiss*) Files
  - [ ] Take In `.scn` (*Leica*) Files
  - [ ] Take In `.xlsx` (*Microsoft Excel*) Files
- [ ] *Optimisations*
- [ ] *Profiling*

## Create a Node Server
- [ ] Create a ts node server implimenting the API below
  - [J] Setup config files and dir structure
  - [J] Run helloworld app
  - [ ] Implement the HTTP calls needed for API
    - [ ] Make tests for each call

## Implement the HCI-BE API
- [ ] Receiving Files to Store
  - [ ] Handle HTTP
  - [ ] Handle Database
- [ ] Sending Files in Response
  - [ ] Handle HTTP
  - [ ] Handle Database
- [ ] Error Handling
  - [ ] Handle HTTP
  - [ ] Handle Database

## Implement the ML-BE API
- [ ] Receiving Files to Store
  - [ ] Handle HTTP
  - [ ] Handle Database
- [ ] Sending Requests
  - [ ] Handle HTTP
  - [ ] Handle Database
- [ ] Error Handling
  - [ ] Handle HTTP
  - [ ] Handle Database

## Testing
- [ ] Basic Unit Test Coverage
- [ ] *Mock HCI*
- [ ] *Mock ML*
- [ ] *Extensive Unit Testing*

## Write Report

## General Notes
- Records should be in CSV format (UTF8)
- 1 Record per Line
- Fields separated by ,
- Every Record same # of fields
- First Row has labels

- Requests have the form of "/project/files/directory/file?filters"
  - "file" is uuid or file-path
  - "project" is project name
  - "?" separates path from interface
  - "filters" are a number of key-value pairs separated by &
    - view
          =meta              : returns coloumns names and indexes
          =file ORlack_of    : actual data
    - cols
          =0,4,3             : specifies cols to filter
          =* OR lack_of      : all coloumns
    - rowstart
              =20            : first row to be included in search
              default 0
    - rowcount
              =15            : number of rows to return
              default all
    - img_channel            : index of colour channel
    - img_zoomlevel          : a number representing the 'zoom level' desired 
    - img_xoffset,img_yoffset: relative to top left corner, UNITS: 'real pixels', i.e. agnostic of zoom levels
    - img_width              : UNITS: 'real pixels', i.e. agnostic of zoom levels
    - img_height             : UNITS: 'real pixels', i.e. agnostic of zoom levels
  - Post requests upload entire file