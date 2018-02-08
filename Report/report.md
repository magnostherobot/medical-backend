# Junior Honours Project 2017 - 2018  
## BACKEND GROUP 4.
|User ID | Name     | Matrticulation Number  |
|:------:|:--------:|:----------------------:|
|cjd24   | Calum    | 150011830              |
|trh     | Tom      | 150001937              |
|har4    | Hafeez   | 15              |
|jl247   | Josh     | 15              |
|jw255   | Johannes | 15              |






### Requirements Overview:
For every version you submit, you are required to submit the following to MMS as a team:  

1) A working version of your software, which includes a test suite. By version we
mean a version of the finished product. It is up to you to decide how you have divided
the entire finished product into versions.

2) A report which details how you have followed the SCRUM process.  

    It should include:

    a) A list of all user stories contained in your Product Backlog and Release Backlog;
       this is expected to evolve from version to version.

    b) Documented evidence that you have followed SCRUM, e.g., timestamped photographs of
       your Product Backlog, Release Backlog, Sprint Backlogs, and task boards (if you
       are using a physical whiteboard), or timestamped screen grabs of any tools you
       are using instead.

    c) The process you used to estimate how long user stories would take to implement.
       A burndown chart should also be included to track progress.

    d) Team structure and role assignment

    e) Meeting outcomes: sprint planning, sprint retrospective, and an overview of
       stand-up meetings (i.e. meetings don’t need to be documented individually)

3) You should then demo the working version of your software to your supervisor at
   one of your regular meetings.






### Design Choices:
- Scrum

- Database

- Server






### Year Wide Protocol Compilation:
As part of this practical, a final solution to the over-arching problem is that the end-user
should be able to "*pick-n-mix*" one submission from each [Backend, HCI, Machine Learning].  
In order to successfully achieve this, all of the participating groups throughout the year
are required to formulate between themselves and agree on a single protocol for each
component to talk over.
Various meetings were organised on a variety of topics between members who were interested
in affecting the outcome. Minutes of these meetings can be seen at:
[Maybe Here?](https://github.com/CS3099JH2017/cs3099jh)







### Scrum:
After groups were eventually allocated for this group project, the team met up quickly to
discuss the **Scrum** method of doing work, and figure out how roles should be shared amongst
the team members.  
It was initially decided that Tom would be the "Scrum Master", and Calum would be the
"Product Owner", and that the roles would be rotated around other group members,
approximately bi-weekly.  
A quick brainstorming session was then had to interpret our specification and quickly fill
in the User Epic stories, along with some more decomposed stories and requirements.
As the specification requires, the following is a list of the stories the group came up with.

- User Epic stories  
    - Create a "plug and play" module, providing backend functionality to the clients requirements.
    - Conform to a year-wide protocol specification to ensure inter-operability.
    - Support the notion of 'Projects', 'Users' with specialisations such as Admin, 'Conversion to Standard File Formats'.
    - Be Complete by 23rd April 2018.
- Design
    - Design Test Interface  
        - Separation of Machine Learning tests & HCI tests.
        - Plan what mocks of other groups are required to ensure usability.
    - Design Server
        - Stubs for conforming to protocol
        - Structure and Core Packages
        - Language(s)? we will use & why.
    - Design Database
        - Which database will we use?
        - Schema
        - ER Diagram
- Database Implementation
    - Interface/Linking with the root to the file system.
    - Notion of Secure Access for the database.
    - Dealing with various filetypes - Conversion / Standardisation for storage.
    - Standard procedures for fetching.
    - Deal with Storing Image Data (+ other binary formats?) / JSON.
    - Deal with storing plain text + tabular data.
    - Create Database from schema
- Server Implementation
    - Setup initial HelloWorld Sever to ensure correct installation & dependencies.
    - Create Strong/Reliable link between server functions and underlying filesystem for database.
    - Create Strong/Reliable link between server functions and the database.
    - Create pre-processing functions to standardise Data passed in. (images->png & plaintext->csv/json)
    - Deal with responses to a client
        - Involving continuous file transfer (For example, whilst panning Large Pathology photos.)
        - Involving 'simple' file transfer (getting whole file at once for csv etc.)
        - Involving file uploads All at once.
        - Involving file uploads in chunks for files above 8Mb.
    - Create Node "router" to capture all required URLs and forward to functions to handle based on protocol.
    - Create Basic error response functions which can be called from anywhere to deal with any potential problems and safely respond to client.
- Server Testing
    - Create methods to test logic of JS/TS which can be re-run on each commit
        - From Backend's perspective
        - From HCI's perspective
- Database Testing
    - Carrying out Optimisations/Streamlining
    - Profiling of performance of UnCommon Actions (delete)
    - Profiling of performance of common actions (file creation/file reads)
    - Accuracy of file retrieval
- TestInterface Implementation
    - Create HTML5/JS to retrieve NON image data and display
    - Create HTML5/JS to retrieve image (or section of) data and display
    - Create HTML5/JS to begin an ML session on some data and retrieve results.
    - Create HTML5/JS to check a user/group information
    - Create HTML5/JS to upload various filetypes and ensure they convert to universal format.
    - Create HTML5/JS to action a login
- Extension Implementation
    - Develop a Caching function for frequently accessed files, or anticipate UUIDs next to be accessed for increased performance.
    - Upgrade all HTTP interactions to HTTPS
    - Add support for Lecia file conversion (heavily licenced)


    - Need to upload the pictures of our scrum board to the repository/report!







### Sources:
[Help regarding creating a restful api with both node and typescript as a combo](http://mherman.org/blog/2016/11/05/developing-a-restful-api-with-node-and-typescript/#.WlW1fhdpw8o)  
[Typescript for Node](https://basarat.gitbooks.io/typescript/docs/quick/nodejs.html)  
[Sequelize (ORM library for connecting to the Postgres Database)](https://sequelize.readthedocs.io/en/v3/)  
[Sequelize-Typescript specialisation (For making sequelize more adapted for postgres over mysql)](https://github.com/RobinBuschmann/sequelize-typescript)  
