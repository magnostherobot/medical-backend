import {Router, Request, Response, NextFunction} from 'express';
const Files = null;//require('../data');


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
  }

  /*
   * expose additional configuration options for individual users
   * 
   * 
   */
  public getUserProperties(req: Request, res: Response, next: NextFunction, user?: String){
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
  }

  public getCurUser(req: Request, res: Response, next: NextFunction){
    let curUser : String = "";
    this.getUsername(req, res, next, curUser);
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
  }

  /*
   * additional configuration options for individual projects
   */
  public getProjectProperties(req: Request, res: Response, next: NextFunction){
  }

  /**
   * GET a File.
   */
  public getFile_path(req: Request, res: Response, next: NextFunction) {
    let fileID = req.params.file;

    res.send("File");
  }

  /**
   * GET a File.
   */
  public getFile_id(req: Request, res: Response, next: NextFunction) {
    let fileID = req.params.file;

    res.send("File");
  }


  /**
   * Post a File. / delete / move / etc
   */
  public postFile_path(req: Request, res: Response, next: NextFunction) {
    let fileID = req.params.file;

    res.send("File");
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

export default fileRoutes.router;
