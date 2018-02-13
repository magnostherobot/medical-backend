# Junior Honours Project 2017 - 2018  
## BACKEND GROUP 4.
|User ID | Name     | Matrticulation Number  |
|:------:|:--------:|:----------------------:|
|cjd24   | Calum    | 150011830              |
|trh     | Tom      | 150001937              |
|har4    | Hafeez   | 160006551              |
|jl247   | Josh     | 150010415              |
|jw255   | Johannes | 140013112              |






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
Using the scrum approach as advised by the project specifications facilitated the planning and running of group meetings. As the year wide protocol continued to change throughout the development process, an agile working process addressed the complex problem of changing requirements through its iterative and incremental system.
One of the essential parts of this process was distribution of responsibility, planning of time and ordering of tasks for the next release. Oftentimes we had to spend some time researching a topic before we could decide on the task allocation and if it should be included in the next release. For example, we decided early on that the file-conversion was less important... **To be continued**
**MORE SHOULD BE SAID HERE PLZ?**

- Database  
We chose to use Postgres for our database system, after considering the benefits and drawbacks of different databases compatible with NodeJS. Its greatest advantage is its object-relational data model, JSON support and scalability. We also decided that it would be significantly less efficient to store our raw files inside the database as Blobs etc. This is because the nature of the files that we will be dealing with are likely to be huge. So storing masses of binary data in the database which is likely to never actually be "edited" in the same way as some other binary data might, then it would be a significant overhead for no return. As such we opted for designing our infrastructure in such a way that we will have a (nearly) '*flat*' filesystem, where all files are stored under a UUID. All notion of "directory hierarchy" and "filenames" would be stored internally with relations in the database. As possible extensions, we could then store direct references to files (or perhaps even offsets within files) to act as a very high performing cache server for frequent data, or data that we could predict is going to be accessed in short time proximity.

- File management

-- Folders
A part of the specification required the use of folders to group together files in a project. The issue I first came across were how folders not just contained other files but would quite often have other folders inside them as well. My second issue was navigating through the folders to get to the files, this meant that given a folder you could return the contents of that folder as well as being able to find all other files at the same level in the system.

To manage my first issue I included a table called dirent with an inheritance relation so that a dirent could either be a folder, image or text. Having this table made it easy to query on data as well as better representing how files could be stored within folders. This meant that a folder would be related to a dirent which could then be linked to the specific type on creation. 

There were two ways to manage the navigability, either store the file path with each dirent or store the ID of the superfolder it was contained in, I decided on storing the ID. This created a link system and to therefore view files within a folder you would search all files which had the same ID as the super folder. 

E.g 1) To locate an image called image1 at folder1/folder2/folder3/image1 to find it you would use the queries 

SELECT * FROM dirent NATURAL JOIN folder WHERE folder_name = 'folder1' AND super_folder is null AND project_name = 'project 1';
SELECT * FROM dirent WHERE super_folder = '77dea3b7-523e-463a-aff1-3d8b92259fbb';
SELECT * FROM dirent WHERE super_folder = '12596fe5-2838-4cc0-8d2f-4745e91738f5';
SELECT * FROM dirent NATURAL JOIN image WHERE super_folder = '22b94214-6942-40dd-b8af-deb1371fa298';
![Alt text](1.png?raw=true "eg1")

From this directory if you wanted to find dirents contained within folder 2 you could use the queries 

SELECT * FROM dirent WHERE id = '22b94214-6942-40dd-b8af-deb1371fa298';
SELECT * FROM dirent WHERE super_folder = '12596fe5-2838-4cc0-8d2f-4745e91738f5';
![Alt text](2.png?raw=true "eg1_cont")
Showing all three dirents in this folder.

-- File identification
In choosing the ID for the files I originally had an auto increment ID. The issue with this would be that a hazardous user could guess the ID of a specific file, accessing files without the required permission. To get around this I used a randomly generated UUID. This made it almost impossible to guess the ID and is universally unique.

-- File storage
Originally I thought of storing files within the database in blob format although this seemed to work well I felt that the scalability of this method would be not be effective. I also felt that it would be a lot harder to backup the database as the number of files grew. Instead the database contained the structure of the file system with info for each file including the UUID for each file. This made it easy to return files from our own file storage system with matching UUID each time a request was made.

-- Projects
Another requirement of the database was the need for projects which also helped group together files. A user could also have per project privileges such as adding files into that project. To manage this, on creation of a project it was given an owner matching the current logged in user. I created a trigger which also granted all permissions (admin) to the owner giving them control over the permissions for their project.

E.g 2) using 
INSERT INTO project ("project_name", "owner") VALUES ('project 1', 'josh')
Would give all permissions to josh in project 1.



- User management 

Once the file system had been set up I wanted to have a robust user permission system that would consistently allow the API to check permissions. 

Permissions were split into 2 types 
User based permissions.
The user based permissions were create project, create user, remove user , edit user, view projects and view users.

Project based permissions.
The project based permissions were add files, edit files, remove files and view files (remove project could also be included here but I decided to make that only accessible to the owner and an admin user) This was more difficult because each user would have different privileges on different projects.

-- Set up
My initial thought was to have columns for each permission in the user table. I soon realised this was hard to manage once revoking privileges is implemented. I decided on creating a tree system for user permissions similar to how the database manages its own privileges. This meant that if one user granted many permissions and then had their own permission removed, all user permissions granted by the revoked user would also be removed. I decided to represent this by having a table for each permission. There were two main reasons for this 

1) This made it easy to check permissions e.g to check whether a user had add file permissions you would just go into the add_files table and check whether it contained a row corresponding to that user. 

2) On each grant the permission ID is stored as a foreign key of its own table representing how a specific user was given that permission . This meant that if a user was deleted or a privilege was revoked it would also remove privileges of sub grants by using ‘on delete cascade’

E.g 3) the image below shows the table add_files 
![Alt text](3.png?raw=true "add_files")
Josh granted permission to user 2 who then granted permission to both user 3 and back to user2. When user 2 has his permission revoked both permissions that were granted by user 2 are also revoked. 
![Alt text](4.png?raw=true "granted permissions")


-- Returning all permissions for each user
On looking at the specification it seemed clear that there were a lot of API requests to get all permissions that a user had been granted. By storing the permissions in their own table required searching every single table every time you wanted to do this which would be ineffective. Combining this with my original idea I created a summary table, if a user was then granted a permission it was added into the summary table with the permission ID by means of a trigger. This meant a slower insert but was highly beneficial in being easy to search. The combination of these two methods kept the system robust whilst making it easy to query on.

Ex 4) Following on from example 2 it is now easy to see how all the permissions are given to a user when a project is created.  
![Alt text](5.png?raw=true "eg4")
Also if josh grants permission to user2 to add files you can see below the permission is added.
![Alt text](6.png?raw=true "eg4_cont")
When the permission is revoked that column for user2 is set null. 
![Alt text](7.png?raw=true "eg4_cont2")

-- User information
In order to login the user the user table  contains a password to each user. This password was stored md5 hashed. (I also want to add salting for a later hand in for additional security).
Also in the user data is metadata both private and public that could be seen/ managed based on your own permissions or whether you are viewing yourself. I used views to represent the different accesses on the user table to prevent things such as password being included in the query result. I also stored this metadata as Json type instead of individual columns for each attribute. This made it easier to match the expected request format and also helped group together the metadata. 



- Server  
For the implementation of the server, we chose a typescript-nodejs approach. NodeJS seemed a common and sensible choice, as all members of the team had previous experience and it is a scalable, and well-supported development framework that runs on both Unix and Windows infrastructures. It is easy to deploy and furthermore offers more speed and a nonblocking I/O API in comparison to Java or .Net servers. We then chose the TypeScript superset of JS as it provides typing, classes, interfaces and IDE support for developers which makes the language easier to use and more robust. In particular we chose to specialise our node app with express, and a comprehensive middleware stack. This middleware stack would carry out tasks such as logging, body parsing, type checking, with potential to be expanded as the project matures. We also decided on Sequelize as our ORM. This was due to wide support in the deployment community with favourable reviews of its functionality - as well as having a specialisation called sequelize-typescript, which massively simplifies syntax, and appeared to integrate to our design model very nicely.

- Project Approach and Expansion  
Once most of the core decisions had been made in isolation of the incorporation into the submission as a whole, we had a **meeting** to decide how these should best operate together.  
The approximate approach that was decided on is as follows:  
    - The Node Server would catch all valid API endpoint requests and pass them to handler functions.  
    - Since almost all requests that are made to the server, some way or another need to talk to the database, then during initialisation of the server, a connection would be made to the postgres database, which would persist throughout the life of the server. This connection would then be utilised by our ORM solution to carry out queries.  
    - The request would be formulated through the ORM (or by direct file access for things like server config.) and then passed to the DB serer.
    - The response would hopefully be ready as we require it, however at this stage there can be logical checks done of the data if necessary.
    - We would then run it through some typechecking middleware to ensure that the content that we are serving back to a client is valid JSON.
    - The Response would be served back to the client and the request would be considered *successful*.  

  Expansion:
  - Once the basic implementation according to the protocol was complete, it was discussed on multiple occasions, and in detail of possible ways to make this core service better.
  - Building on the ATOMIC nature of a database transaction, and given the Users deployment scenario - multiple research facilities potentially across multiple geographically diverse locations, we thought it would be critical to allow the database to have multiple instances operating concurrently.
      - Approximately how this would look, is that clients talk to the backend server they are physically closest to on the network for the best possible latency.
      - Since there can be multiple nodes however to serve clients in different locations, then the servers would then need to make best attempt to synchronise in an Atomic manner.
      - This would make our system far more scalable in the future, and may have potential applications for things such as a "live" backup server - since medical data is all fairly critical.
  - On top of the transactions to the Database being atomic and synchronised across all instances of the server, we would additionally need to consider the physical distribution of file storage.
      - Since we made the design decision to store all of the actual files, outside of the database, then keeping ATOMIC communication to each instance server, does not necessarily solve the issue of file replication.
      - For example, if a memeber of a group is working on a node other than the "root" node where that project was created and all of the data happens to be stored for it, then we will need to include some kind of notion of a "server reference" for each file known about by the database.
      - Then, if a client made a request for data not locally stored, it could either be re-directed by the server to the other node, or the server forwards the request then pipes it back to the client.
      - Alternatively as a further specialisation of this functionality, the server could intelligently detect related data to the "foreign" request being made, and pre-emptively load in the data from the alt server, so it is ready to serve future data locally. This data could be cached locally and used, then re-synchronised if changes were made back to the original, or dropped if it was just for reading. It is likely however that most of these interactions will be reads, so things like carrying out a machine learning session on some data, would only require the (probably) smaller file containing the results to be synchronised back which is a much easier task as it would likely just be new file upload to the remote server.







### Year Wide Protocol Compilation:
As part of this practical, a final solution to the over-arching problem is that the end-user
should be able to "*pick-n-mix*" one submission from each [Backend, HCI, Machine Learning].  
In order to successfully achieve this, all of the participating groups throughout the year
are required to formulate between themselves and agree upon a single protocol for each
component to talk over.
Various meetings were organised on a variety of topics between members who were interested
in affecting the outcome. Minutes of these meetings can be seen at:
[Maybe Here?](https://github.com/CS3099JH2017/cs3099jh)  
**We should also probably detail roughly what was said at each of these meetings/summaries etc? GET THE RECORDED DATES**









### Scrum:
After groups were eventually allocated for this group project, the team met up quickly to
discuss the **Scrum** method of doing work, and figure out how roles should be shared amongst
the team members.  
  Team Structure and Role assignment  
  -Supervisor ->    Adam  
  -Scrum Master ->  Tom  
  -Product Owner -> Calum  
  -Developer ->     Hafeez  
  -Developer ->     Josh  
  -Developer ->     Johannes  

It was initially decided that Tom would be the "Scrum Master", and Calum would be the
"Product Owner", and that the roles would be rotated around other group members,
approximately bi-weekly.  
A quick brainstorming session was then had to interpret our specification and quickly fill
in the User Epic stories, along with some more decomposed stories and requirements.
As the specification requires, the following is a list of the stories the group came up with.  


(Time Est | Time taken)
- User Epic stories  ------- (Continuous)  
    - Create a "plug and play" module, providing backend functionality to the clients requirements.  ------- (Continuous)
    - Conform to a year-wide protocol specification to ensure inter-operability.  ------- (Continuous)
    - Support the notion of 'Projects', 'Users' with specialisations such as Admin, 'Conversion to Standard File Formats'.  ------- (Continuous)
    - Be Complete by 23rd April 2018.
	- First Release 9th February 2018
- Design  ------- (2-3 Weeks | 3 Weeks)
    - Design Test Interface ------- (3 Days | 1 Week)
        - Separation of Machine Learning tests & HCI tests.  ------- (1 Day | 3 days)
        - Plan what mocks of other groups are required to ensure usability.  ------- (2 Days | 4 days)
    - Design Server  ------- (1 week | 1.5 Weeks)
        - Stubs for conforming to protocol  ------- (1 Day | 3 Days)
        - Structure and Core Packages  ------- (5 Days | 1 week)
        - Language(s)? we will use & why.  ------- (1 Day | 1 Day)
    - Design Database  ------- (1 week | 1.5 Weeks)
        - Which database will we use?  ------- (1 Day | 1 Day)
        - Schema  ------- (2 Days | 2 Days)
        - ER Diagram  ------- (5 Days | 1 Week)
- Implementation   ------- (Continuous)
    - Database Implementation ------- (~3 Weeks)
        - Interface/Linking with the root to the file system.  ------- (3 Days)
        - Notion of Secure Access for the database. ------- (1 Week)
        - Dealing with various filetypes - Conversion / Standardisation for storage. ------- (2 Days)
        - Standard procedures for fetching. ------- (2 Days)
        - Deal with Storing Image Data (+ other binary formats?) / JSON. ------- (5 Days)
        - Deal with storing plain text + tabular data. ------- (5 Days)
        - Create Database from schema  ------- (3 Days)
    - Server Implementation ------- (~1.5 Months | 2 Months)
        - Setup initial HelloWorld Sever to ensure correct installation & dependencies. ------- (1 Day| 1 Day)
        - Create Strong/Reliable link between server functions and underlying filesystem for database. ------- (1 Weeks | 2 Weeks)
        - Create Strong/Reliable link between server functions and the database. ------- (5 Days 1 Week)
        - Create pre-processing functions to standardise Data passed in. (images->png & plaintext->csv/json) ------- (1 Week | in proc.)
        - Deal with responses to a client ------- (4 Weeks | in proc.)
            - Involving continuous file transfer (For example, whilst panning Large Pathology photos.) ------- (1 Week)
            - Involving 'simple' file transfer (getting whole file at once for csv etc.) ------- (1 Week)
            - Involving file uploads All at once. ------- (1 Week)
            - Involving file uploads in chunks for files above 8Mb. ------- (1 Week)
        - Create Node "router" to capture all required URLs and forward to functions to handle based on protocol. ------- (1 Day)
        - Create Basic error response functions which can be called from anywhere to deal with any potential problems and safely respond to client. ------- (2 Days)
- Testing  ------- (9 Weeks | in proc)
    - Server Testing ------- (3 Weeks | in proc)
        - Create methods to test logic of JS/TS which can be re-run on each commit ------- (2 Weeks | in proc)
            - From Backend's perspective ------- (1 Week | 2 Weeks)
            - From HCI's perspective ------- (1 Weeks | in proc)
	- Create unit tests for individual files can be re-run on each commit ------- (1 Weeks | 1 Weeks)
    - Database Testing ------- (2 Weeks | in proc.)
        - Carrying out Optimisations/Streamlining ------- (5 Days)
        - Profiling of performance of UnCommon Actions (delete) ------- (4 Days)
        - Profiling of performance of common actions (file creation/file reads) ------- (4 Days)
        - Accuracy of file retrieval ------- (1 Day)
    - TestInterface Implementation ------- (2 Weeks | 2 Weeks)
        - Create HTML5/JS to retrieve NON image data and display ------- (1 Day | 2 Days)
        - Create HTML5/JS to retrieve image (or section of) data and display ------- (1 Day | 4 Days)
        - Create HTML5/JS to begin an ML session on some data and retrieve results. ------- (1 Day | 1 Day)
        - Create HTML5/JS to check a user/group information ------- (1 Day | 1 Day)
        - Create HTML5/JS to upload various filetypes and ensure they convert to universal format. ------- (1 Day | 2 days)
        - Create HTML5/JS to action a login ------- (1 Day | 2 days)
- Extension Implementation ------- (~3 Weeks | outstanding)
    - Develop a Caching function for frequently accessed files, or anticipate UUIDs next to be accessed for increased performance. ------- (1 Week)
    - Extend our basic server implementation, to support multiple instances and ensure ATOMICity of DB and sensible file distribution. ------- (2 Weeks)
    - Upgrade all HTTP interactions to HTTPS ------- (2 Days)
    - Add support for Lecia file conversion (heavily licenced) ------- (2 Weeks)


Additionally as part of following the scrum methodology of development, the group carried out a selection of meetings to:  
1) Evaluate the current sprint (Work complete, standard, sprint time etc.  
2) Retrospectively plan anything with crept up throughout the past sprint, and evaluate how we dealt with it.  
3) Catch up with each others' progress and decide on work distribution  
The Following is a quick summary of these meetings:

> Meeting 1:
> > Date:  
> Time:  
> Attendance:  
> Content :  

> Meeting 2:
> > Date:  
> Time:  
> Attendance:  
> Content :  

# Need to upload the pictures of our scrum board to the repository/report!  
# ALSO need to upload our burn-down charts to this report.  





### Sources:
[Help regarding creating a restful api with both node and typescript as a combo](http://mherman.org/blog/2016/11/05/developing-a-restful-api-with-node-and-typescript/#.WlW1fhdpw8o)  
[Typescript for Node](https://basarat.gitbooks.io/typescript/docs/quick/nodejs.html)  
[Sequelize (ORM library for connecting to the Postgres Database)](https://sequelize.readthedocs.io/en/v3/)  
[Sequelize-Typescript specialisation (For making sequelize more adapted for postgres over mysql)](https://github.com/RobinBuschmann/sequelize-typescript)  
