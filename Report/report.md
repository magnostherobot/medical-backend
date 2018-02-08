# Junior Honours Project 2017 - 2018  
## BACKEND GROUP 4.
|User ID | Name     | Matrticulation Number  |
|:------:|:--------:|:----------------------:|
|cjd24   | Calum    | 150011830              |
|trh     | Tom      | 150001937              |
|har4    | Hafeez   | 15              |
|jl247   | Josh     | 15              |
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

- Database
We chose to use Postgres for our database system, after considering the benefits and drawbacks of different databases compatible with NodeJS. Its greatest advantage is its object-relational data model, JSON support and scalability. 
After discussions of the product backlog, we decided to divide data into the following tables:
[tables and descriptions here]
[some more explanation of the database structure]

- Server
For the implementation of the server, we chose a typescript-nodejs approach. NodeJS seemed an obvious approach, as all members of the team had previous experience and it is a scalable, and well-supported development framework that runs on both Unix and Windows infrastructures. It is easy to deploy and furthermore offers more speed and a nonblocking I/O API in comparison to Java or .Net servers. We then chose the TypeScript superset of JS as it provides typing, classes, interfaces and IDE support for developers which makes the language easier to use and more robust.





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

    - Need to upload the pictures of our scrum board to the repository!







### Sources:
[Help regarding creating a restful api with both node and typescript as a combo](http://mherman.org/blog/2016/11/05/developing-a-restful-api-with-node-and-typescript/#.WlW1fhdpw8o)  
[Typescript for Node](https://basarat.gitbooks.io/typescript/docs/quick/nodejs.html)  
[Sequelize (ORM library for connecting to the Postgres Database)](https://sequelize.readthedocs.io/en/v3/)  
[Sequelize-Typescript specialisation (For making sequelize more adapted for postgres over mysql)](https://github.com/RobinBuschmann/sequelize-typescript)  
