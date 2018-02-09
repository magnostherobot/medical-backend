import {Router, Request, Response, NextFunction} from 'express';
import {default as UserGroup} from './db/model/UserGroup';
import {default as User} from './db/model/User';
import { default as File } from './db/model/File';
import Project from './db/model/Project';
import ContributorGroup from './db/model/ContributorGroup';

var serverConfig = require('./serverConfig');
const Files = null;//require('../data');
const BASE_FILE_STORAGE: string = __dirname + '/storage';

export class FileRouter {
  router: Router

  /**
   * Initialize the FileRouter
   */
  constructor() {
    this.router = Router();
    this.init();
  }

  /*
   * Returns the supported Protocols
   *
   * The server's unwrapped response MUST match:

    exactly({
        "supported": array(string),
        "required": array(string)
    })
   */
  public getProtocols(req: Request, res: Response, next: NextFunction){
      var returnValue = {
        supported: [],
        required: [
          "BE01"
        ]
      };
      res.send(JSON.stringify(returnValue));
  }

  /*
   * Logging Endpoint for all components:
   *
   * with a request matching

    array({
        "component": string,
        "level": alternative(["info", "security", "warning", "error", "critical"]),
        "value": anything
    })
   */
  public postLog(req: Request, res: Response, next: NextFunction){
      res.status(501).send({error : "logging_not_enabled"});
  }

  /*
   * Clients authorised as a user with the admin privilege can access
   *
   * http://backend.endpoint/log?before=<datetime>&after=<datetime>&level=<level>
   *
   * the server response should match

    array({
        "component": string,
        "level": alternative(["info", "security", "warning", "error", "critical"]),
        "value": anything,
        "username": string,
        "timestamp": string
    })
   */
  public getLog(req: Request, res: Response, next: NextFunction){
      res.status(501).send({error : "logging_not_enabled"});
  }

   /*
   * Any authenticated client can access
   *
   * http://backend.endpoint/properties
   *
   * the server SHOULD respond with a list of properties, with the unwrapped response matching

    array({
        "id": string,
        "display": optional({
            "category": string,
            "group": string,
            "display_name": string,
            "description": string
        }),
        "read_only": boolean,
        "type": alternative(["string", "integer", "boolean"]),
        "value": alternative([string, integer, boolean])
    })
   */
  public getProperties(req: Request, res: Response, next: NextFunction){
      res.status(200).send(serverConfig.default);
  }

  /*
   * To update properties the client POSTs to
   *
   * http://backend.endpoint/properties?action=update
   *
   * with body

      array({
          "id": string,
          "value": alternative([string, integer, boolean])
      })
   */
   public postProperties(req: Request, res: Response, next: NextFunction){
        var success = true;

        //For each property to update
        for (var prop of req.body) {

            //Check that the property has and id and a value
            if (!prop.hasOwnProperty("id") || !prop.hasOwnProperty("value")) {
                res.status(400).send({error : "invalid_request", error_description : "A supplied property is missing an id or value"});
                success = false;
                break;
            }

            //Find out if the property exists in the config and if so, at which index
            var index = serverConfig.propertyExists(prop.id);

            //check some of the properties values to ensure that it can be updated
            if (index == -1 || serverConfig.default[index].read_only) {    /*TODO Implement an or, using Tom's type checker to ensure the value is "valid" based on the type of the property */
                var description = index == -1 ? "Property not found" : "Property is Read_Only";
                res.status(400).send({error : "invalid_property", error_data : prop.id, error_description : description});
                success = false;
                break;
            }

            //make the update to the property
            serverConfig.default[index].value = prop.value;
        }

        //tell the client that everything was okay;
        if (success) res.status(200).send();
    }

  /*
   * Listing available privileges
   *
   * And the server's response, unwrapped, must match

    array({
        "privilege": string,
        "description": string,
        "internal": boolean
    })
   */
  public getUserPriveleges(req: Request, res: Response, next: NextFunction){
    UserGroup.findAll()
    .then((permissions) => {
        res.json(permissions.map<any>(
            (p: UserGroup) => p.getPrivelege()
        ));
    });
  }

  /*
   * Listing users
   *
   * If the client is authorised as a user with the admin privilege
   * the server MUST respond with a list of users, with the unwrapped response matching

    array({
        "username": string,
        "privileges": array(string),
        "projects": array({
            "project_name": string,
            "access_level": string
        }),
        "public_user_metadata": metadata,
        "private_user_metadata": metadata,
        "public_admin_metadata": metadata,
        "private_admin_metadata": metadata
    })
   */
  public getUsers(req: Request, res: Response, next: NextFunction){
    User.findAll({
      include: [
        UserGroup,
        Project
      ]
    }).then((user) => {
          res.json(user.map<any>(
              (u: User) => u.getUserFullInfo()
          ));
      });
  }

  /*
   * expose additional configuration options for individual users
   *
   *
   */
  public getUserProperties(req: Request, res: Response, next: NextFunction, user?: String){
      res.status(500).send({error: "unsupported", error_description: "Users on this server dont have additional configuration options."});
  }

  private async userInfoFromName(name: string) {
      let user: User = await User.findOne({
          where: {
              username: name
          },
          include: [
            UserGroup,
            Project
          ]
      });

      return user.getUserFullInfo();
  }

  /*
   * Listing a particular User
   *
   * If the client is authorised as a user with the admin privilege the server MUST respond with details of the particular user if they exist (unwrapped response):

    {
        "username": string,
        "privileges": array(string),
        "projects": array({
            "project_name": string,
            "access_level": string
        }),
        "public_user_metadata": metadata,
        "private_user_metadata": metadata,
        "public_admin_metadata": metadata,
        "private_admin_metadata": metadata
    }
   */
  public getUsername(req: Request, res: Response, next: NextFunction, user?: String){
      this.userInfoFromName(req.params.username)
        .then((info) => res.json(info));
  }

  public getCurUser(req: Request, res: Response, next: NextFunction){
      // TODO need to findo out where authenticated user info goes
      // this.userInfoFromName(req.params.username)
      //   .then((info) => res.json(info));
      res.json({todo: "need to findo out where authenticated user info goes"});
  }

  /*
   * Updating the current user
   *
   * http://backend.endpoint/current_user?action=update
   *
   * with body matching

    {
        "password": optional({
            "old": string,
            "new": string
        }),
        "public_user_metadata": optional(metadata),
        "private_user_metadata": optional(metadata),
        "public_admin_metadata": not_present,
        "private_admin_metadata": not_present
    }
  */
  public postCurUser(req: Request, res: Response, next: NextFunction){
      res.json({todo: "need to implement meeeee"});
  }

  /*
   * Creating a User/updating a user
   *
   * http://backend.endpoint/users/<username>?action=create
   *
   * with body matching

    {
        "privileges": array(string),
        "password": string,
        "public_user_metadata": optional(metadata),
        "private_user_metadata": optional(metadata),
        "public_admin_metadata": optional(metadata),
        "private_admin_metadata": optional(metadata)
    }
   */
  public postUsername(req: Request, res: Response, next: NextFunction){
      res.json({todo: "need to implement meeeee"});
  }

  /*
   * Listing available Roles
   *
   * The servers response, unwrapped, must match

    array({
        "role": string,
        "description": string,
        "internal": boolean
    })
   */
  public getProjectRoles(req: Request, res: Response, next: NextFunction){
      ContributorGroup.findAll()
        .then((cgs: ContributorGroup[]) => {
            res.json(cgs.map<any>(
                (cg: ContributorGroup) => cg.getGroupFullInfo()
            ));
        });
  }

  /*
   * Listing Projects
   *
   * The server MUST respond with a list of projects, with the unwrapped response matching

    array({
        "project_name": string,
        "users": array({
            "username": string,
            "access_level": string
        }),
        "public_metadata": metadata,
        "private_metadata": optional(metadata),
        "admin_metadata": optional(metadata)
    })
   */
  public getProjects(req: Request, res: Response, next: NextFunction){
    Project.findAll({
      include: [
        User
      ]
    }).then((projects) => {
          res.json(projects.map<any>(
              (p: Project) => p.getProjectFullInfo()
          ));
      });
  }

  /*
   * Listing a specific Project
   *
   * The server MUST respond with details of the particular project if it exists (unwrapped response):

    {
        "project_name": string,
        "users": array({
            "username": string,
            "access_level": string
        }),
        "public_metadata": metadata,
        "private_metadata": metadata,
        "admin_metadata": optional(metadata)
    }
   */
  public getProjectName(req: Request, res: Response, next: NextFunction){
      Project.findOne({
          where: {
              name: req.params.project_name
          }
      }).then((project: Project) => res.json(project));

  }

  /*
   * Creating a Project / updating a project / deleting / Project grants
   *
   * http://backend.endpoint/projects/<project_name>?action=create
   *
   * with body matching

    {
        "public_metadata": optional(metadata),
        "private_metadata": optional(metadata),
        "admin_metadata": optional(metadata)
    }
   */
  public postProjectName(req: Request, res: Response, next: NextFunction){
      res.json({todo: "need to implement meeeee"});
  }

  /*
   * additional configuration options for individual projects
   */
  public getProjectProperties(req: Request, res: Response, next: NextFunction){
      res.status(500).send({error: "unsupported", error_description: "Projects on this server dont have additional configuration options."});
  }

  private async getChildFile(names: string[], parentUuid: string): Promise<File> {
      //TODO: Check that this works lol :3
      let child: File = await File.findOne({
          where: {
              parentFolderId: parentUuid,
              name: names[0]
          }
      });
      if (names.length === 1) {
          return child;
      } else {
          names.splice(0, 1);
          return await this.getChildFile(names, child.uuid);
      }
  }

  /**
   * GET a File.
   */
  public async getFile_path(req: Request, res: Response, next: NextFunction) {
      req.params.project_name
      req.params.path

      let project: Project = await Project.findOne({
          where: {
              name: req.params.project_name
          }
      });

      let file: File = await this.getChildFile(
          req.params.project_name, project.rootFolderId);

      res.sendFile(`${BASE_FILE_STORAGE}/${req.params.project_name}/${file.uuid}`);
  }

  /**
   * GET a File.
   */
  public getFile_id(req: Request, res: Response, next: NextFunction) {

      //TODO: implement correctness of project folder checking.
      res.sendFile(`${BASE_FILE_STORAGE}/${req.params.project_name}/${req.params.id}`);
  }













  /**
   * Post a File. / delete / move / etc
   */
  public postFile_path(req: Request, res: Response, next: NextFunction) {
      res.json({todo: "need to implement meeeee"});
  }


  /**
   * Take each handler, and attach to one of the Express.Router's
   * endpoints.
   */
  init() {
    // General
    this.router.get ('/_supported_protocols_',  this.getProtocols);
    this.router.get ('/log',                    this.getLog);
    this.router.post('/log',                    this.postLog);
    this.router.get ('/properties',             this.getProperties);
    this.router.post('/properties',             this.postProperties);
    // Users
    this.router.get ('/user_privileges',        this.getUserPriveleges);
    this.router.get ('/users',                  this.getUsers);
    this.router.get ('/users/:username',        this.getUsername);
    this.router.post('/users/:username',        this.postUsername);
    this.router.get ('/users/:username/properties', this.getUserProperties);
    this.router.get ('/current_user',           this.getCurUser);
    this.router.post('/current_user',           this.postCurUser);
    // Projects
    this.router.get ('/project_roles',          this.getProjectRoles);
    this.router.get ('/projects',               this.getProjects);
    this.router.get ('/projects/:project_name', this.getProjectName);
    this.router.post('/projects/:project_name', this.postProjectName);
    this.router.get ('/projects/:project_name/properties', this.getProjectProperties);
    // File access
    this.router.get ('/projects/:project_name/files/:path',     this.getFile_path);
    this.router.post('/projects/:project_name/files/:id',       this.postFile_path);
    this.router.get ('/projects/:project_name/files_by_id/:id', this.getFile_id);
  }

}

// Create the FileRouter, and export its configured Express.Router
const fileRoutes = new FileRouter();
fileRoutes.init();

var ex: Router = fileRoutes.router;
export default ex;
