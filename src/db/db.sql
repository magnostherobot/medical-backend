--
-- PostgreSQL database dump
--

-- Dumped from database version 10.1
-- Dumped by pg_dump version 10.0

-- Started on 2018-02-07 18:20:04 GMT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 10 (class 2615 OID 17274)
-- Name: project_permissions; Type: SCHEMA; Schema: -; Owner: joshlee
--

CREATE SCHEMA project_permissions;


ALTER SCHEMA project_permissions OWNER TO joshlee;

--
-- TOC entry 8 (class 2615 OID 16582)
-- Name: user_permissions; Type: SCHEMA; Schema: -; Owner: joshlee
--

CREATE SCHEMA user_permissions;


ALTER SCHEMA user_permissions OWNER TO joshlee;

--
-- TOC entry 1 (class 3079 OID 12544)
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- TOC entry 2776 (class 0 OID 0)
-- Dependencies: 1
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- TOC entry 2 (class 3079 OID 17619)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 2777 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 240 (class 1255 OID 17515)
-- Name: add_permission(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION add_permission() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$declare 
var boolean;
begin
execute format('select exists (select project_name from project_permissions.project_permissions_list where $1.username = username and $1.project_name = project_name)') into var using new; 

if var then 
	execute format('UPDATE project_permissions.project_permissions_list SET %I=$1.permission_id WHERE username= $1.username AND project_name= $1.project_name',tg_table_name) using new; 
else
	execute format('insert into project_permissions.project_permissions_list (username,%I, project_name)  values ($1.username, $1.permission_id,$1.project_name)',tg_table_name) using new; 
end if;
return new;
end
$_$;


ALTER FUNCTION project_permissions.add_permission() OWNER TO joshlee;

--
-- TOC entry 254 (class 1255 OID 17371)
-- Name: check_permission(text, text, text); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION check_permission(username text, permission text, project text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare var boolean;
begin
execute format('select exists(select * from project_permissions.%I where username = $1 and project_name = $2)',permission) into var using username,project;
return var;
end;


$_$;


ALTER FUNCTION project_permissions.check_permission(username text, permission text, project text) OWNER TO joshlee;

--
-- TOC entry 247 (class 1255 OID 17281)
-- Name: prevent_edit(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_edit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE unique_violation USING MESSAGE = 'Cannot edit user permissions';
END;





$$;


ALTER FUNCTION project_permissions.prevent_edit() OWNER TO joshlee;

--
-- TOC entry 275 (class 1255 OID 17279)
-- Name: prevent_owner_delete(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_owner_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$declare 
var text;
var2 integer;
begin

select owner into var from project where old.project_name = project_name;
execute format('select count(*) from project_permissions.%I where username = $2 and $1.project_name = project_name',tg_table_name) into var2 using old,var; 
    	if var2 >1 then 
        	return old;
		end if;


    if var = old.username then 
    	RAISE exception 'cannot delete project owner';
	end if;
return old;
end



$_$;


ALTER FUNCTION project_permissions.prevent_owner_delete() OWNER TO joshlee;

--
-- TOC entry 262 (class 1255 OID 17280)
-- Name: prevent_undefined_project_grant(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_undefined_project_grant() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$declare 
var text;
var2 text;
var3 boolean;
begin

execute format('select owner from project where $1.project_name = project_name') into var using new; 
if var = new.username then 
	return new;
end if;

execute format('select project_name from project_permissions.%I where $1.granted_by = permission_id',tg_table_name) into var2 using new; 
if var2 != new.project_name or new.granted_by is null or new.permission_id = new.granted_by then 
    RAISE exception 'Must be granted permission';
end if;	



return new;
end
$_$;


ALTER FUNCTION project_permissions.prevent_undefined_project_grant() OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 245 (class 1255 OID 17312)
-- Name: give_owner_permissions(); Type: FUNCTION; Schema: public; Owner: joshlee
--

CREATE FUNCTION give_owner_permissions() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$declare

BEGIN
execute format('insert into project_permissions.add_files (username,project_name ) values ($1.owner,$1.project_name) ') using new; 
execute format('insert into project_permissions.edit_files (username,project_name ) values ($1.owner,$1.project_name) ') using new; 
execute format('insert into project_permissions.remove_files (username,project_name ) values ($1.owner,$1.project_name) ') using new; 
execute format('insert into project_permissions.view_files (username,project_name ) values ($1.owner,$1.project_name) ') using new; 







RETURN OLD;
END;



$_$;


ALTER FUNCTION public.give_owner_permissions() OWNER TO joshlee;

--
-- TOC entry 286 (class 1255 OID 17577)
-- Name: set_user_permissions(); Type: FUNCTION; Schema: public; Owner: joshlee
--

CREATE FUNCTION set_user_permissions() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$begin
execute format('insert into user_permissions.user_permissions_list (username) values ($1.username)') using new;
return new;
end
$_$;


ALTER FUNCTION public.set_user_permissions() OWNER TO joshlee;

SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 269 (class 1255 OID 17579)
-- Name: add_permission(); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION add_permission() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
begin
	execute format('UPDATE user_permissions.user_permissions_list SET %I=$1.permission_id WHERE username= $1.username',tg_table_name) using new;
    return new;
end

$_$;


ALTER FUNCTION user_permissions.add_permission() OWNER TO joshlee;

--
-- TOC entry 292 (class 1255 OID 17370)
-- Name: check_permission(text, text); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION check_permission(username text, permission text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$declare var boolean;
begin
execute format('select exists(select * from user_permissions.%I where username = $1)',permission) into var using username;
return var;
end;
$_$;


ALTER FUNCTION user_permissions.check_permission(username text, permission text) OWNER TO joshlee;

--
-- TOC entry 251 (class 1255 OID 16907)
-- Name: prevent_admin_delete(); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_admin_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
IF OLD.username = 'admin' THEN
	RAISE unique_violation USING MESSAGE = 'Cannot delete admin user';
END IF;
RETURN OLD;
END;

$$;


ALTER FUNCTION user_permissions.prevent_admin_delete() OWNER TO joshlee;

--
-- TOC entry 255 (class 1255 OID 16911)
-- Name: prevent_edit(); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_edit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
	RAISE unique_violation USING MESSAGE = 'Cannot edit user permissions';
END;



$$;


ALTER FUNCTION user_permissions.prevent_edit() OWNER TO joshlee;

--
-- TOC entry 274 (class 1255 OID 16924)
-- Name: prevent_undefined_grant(); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_undefined_grant() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
if new.granted_by is NULL 
or new.permission_id = new.granted_by then 
	RAISE unique_violation USING MESSAGE = 'access not granted';
end if;
RETURN NEW;
END;
$$;


ALTER FUNCTION user_permissions.prevent_undefined_grant() OWNER TO joshlee;

--
-- TOC entry 288 (class 1255 OID 16726)
-- Name: userexists(text); Type: FUNCTION; Schema: user_permissions; Owner: joshlee
--

CREATE FUNCTION userexists(usertocheck text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
begin
if (
select exists(select * from user_info.user where username = usertocheck))
then return true;
else return false;
end if;
end;
$$;


ALTER FUNCTION user_permissions.userexists(usertocheck text) OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 219 (class 1259 OID 17314)
-- Name: af_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE af_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE af_id_seq OWNER TO joshlee;

SET search_path = project_permissions, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 210 (class 1259 OID 17030)
-- Name: add_files; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE add_files (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.af_id_seq'::regclass) NOT NULL,
    granted_by integer,
    project_name text NOT NULL
);


ALTER TABLE add_files OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 220 (class 1259 OID 17317)
-- Name: ef_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE ef_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE ef_id_seq OWNER TO joshlee;

SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 211 (class 1259 OID 17086)
-- Name: edit_files; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE edit_files (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.ef_id_seq'::regclass) NOT NULL,
    granted_by integer,
    project_name text NOT NULL
);


ALTER TABLE edit_files OWNER TO joshlee;

--
-- TOC entry 230 (class 1259 OID 17475)
-- Name: project_permissions_list; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE project_permissions_list (
    username text NOT NULL,
    add_files integer,
    edit_files integer,
    remove_files integer,
    view_files integer,
    project_name text NOT NULL
);


ALTER TABLE project_permissions_list OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 221 (class 1259 OID 17320)
-- Name: rf_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE rf_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE rf_id_seq OWNER TO joshlee;

SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 212 (class 1259 OID 17110)
-- Name: remove_files; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE remove_files (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.rf_id_seq'::regclass) NOT NULL,
    granted_by integer,
    project_name text NOT NULL
);


ALTER TABLE remove_files OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 223 (class 1259 OID 17326)
-- Name: vf_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE vf_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE vf_id_seq OWNER TO joshlee;

SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 213 (class 1259 OID 17158)
-- Name: view_files; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE view_files (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.vf_id_seq'::regclass) NOT NULL,
    granted_by integer,
    project_name text NOT NULL
);


ALTER TABLE view_files OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 224 (class 1259 OID 17329)
-- Name: cp_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE cp_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE cp_id_seq OWNER TO joshlee;

--
-- TOC entry 225 (class 1259 OID 17332)
-- Name: cu_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE cu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE cu_id_seq OWNER TO joshlee;

--
-- TOC entry 209 (class 1259 OID 16969)
-- Name: dirent; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE dirent (
    project_name pg_catalog.text,
    "UUID" uuid DEFAULT gen_random_uuid() NOT NULL,
    super_folder uuid
);


ALTER TABLE dirent OWNER TO joshlee;

--
-- TOC entry 226 (class 1259 OID 17335)
-- Name: eu_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE eu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE eu_id_seq OWNER TO joshlee;

--
-- TOC entry 200 (class 1259 OID 16447)
-- Name: folder; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE folder (
    folder_name pg_catalog.text DEFAULT '"new folder"'::pg_catalog.text,
    "UUID" uuid NOT NULL
);


ALTER TABLE folder OWNER TO joshlee;

--
-- TOC entry 201 (class 1259 OID 16494)
-- Name: image; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE image (
    image_name pg_catalog.text,
    "UUID" uuid NOT NULL
);


ALTER TABLE image OWNER TO joshlee;

--
-- TOC entry 208 (class 1259 OID 16963)
-- Name: permission_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE permission_id_seq OWNER TO joshlee;

--
-- TOC entry 207 (class 1259 OID 16941)
-- Name: permission_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE permission_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE permission_seq OWNER TO joshlee;

--
-- TOC entry 199 (class 1259 OID 16396)
-- Name: project; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE project (
    project_name pg_catalog.text NOT NULL,
    owner pg_catalog.text NOT NULL,
    public_metadata json,
    private_metadata json,
    admin_metadata json
);


ALTER TABLE project OWNER TO joshlee;

--
-- TOC entry 204 (class 1259 OID 16799)
-- Name: project_name; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE project_name
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE project_name OWNER TO joshlee;

--
-- TOC entry 222 (class 1259 OID 17323)
-- Name: rp_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE rp_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE rp_id_seq OWNER TO joshlee;

--
-- TOC entry 227 (class 1259 OID 17338)
-- Name: ru_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE ru_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE ru_id_seq OWNER TO joshlee;

--
-- TOC entry 202 (class 1259 OID 16502)
-- Name: text; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE text (
    text_name pg_catalog.text,
    "UUID" uuid NOT NULL
);


ALTER TABLE text OWNER TO joshlee;

--
-- TOC entry 203 (class 1259 OID 16552)
-- Name: user; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE "user" (
    username pg_catalog.text NOT NULL,
    password character(32),
    public_user_metadata json,
    private_user_metadata json,
    public_admin_metadata json,
    private_admin_metadata json
);


ALTER TABLE "user" OWNER TO joshlee;

--
-- TOC entry 205 (class 1259 OID 16876)
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE user_id_seq OWNER TO joshlee;

--
-- TOC entry 233 (class 1259 OID 17603)
-- Name: view_current_user; Type: VIEW; Schema: public; Owner: joshlee
--

CREATE VIEW view_current_user AS
 SELECT "user".username,
    "user".public_user_metadata,
    "user".private_user_metadata,
    "user".public_admin_metadata
   FROM "user";


ALTER TABLE view_current_user OWNER TO joshlee;

--
-- TOC entry 234 (class 1259 OID 17611)
-- Name: view_projects_public; Type: VIEW; Schema: public; Owner: joshlee
--

CREATE VIEW view_projects_public AS
 SELECT project.project_name,
    project.owner,
    project.public_metadata
   FROM project;


ALTER TABLE view_projects_public OWNER TO joshlee;

--
-- TOC entry 235 (class 1259 OID 17615)
-- Name: view_projects_regular; Type: VIEW; Schema: public; Owner: joshlee
--

CREATE VIEW view_projects_regular AS
 SELECT project.project_name,
    project.owner,
    project.public_metadata,
    project.private_metadata
   FROM project;


ALTER TABLE view_projects_regular OWNER TO joshlee;

--
-- TOC entry 232 (class 1259 OID 17599)
-- Name: view_users_public; Type: VIEW; Schema: public; Owner: joshlee
--

CREATE VIEW view_users_public AS
 SELECT "user".username,
    "user".public_user_metadata,
    "user".public_admin_metadata
   FROM "user";


ALTER TABLE view_users_public OWNER TO joshlee;

--
-- TOC entry 228 (class 1259 OID 17341)
-- Name: vp_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE vp_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE vp_id_seq OWNER TO joshlee;

--
-- TOC entry 229 (class 1259 OID 17344)
-- Name: vu_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE vu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE vu_id_seq OWNER TO joshlee;

SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 214 (class 1259 OID 17182)
-- Name: create_project; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE create_project (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.cp_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE create_project OWNER TO joshlee;

--
-- TOC entry 206 (class 1259 OID 16887)
-- Name: create_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE create_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.cu_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE create_users OWNER TO joshlee;

--
-- TOC entry 215 (class 1259 OID 17201)
-- Name: edit_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE edit_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.eu_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE edit_users OWNER TO joshlee;

--
-- TOC entry 216 (class 1259 OID 17220)
-- Name: remove_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE remove_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.ru_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE remove_users OWNER TO joshlee;

--
-- TOC entry 231 (class 1259 OID 17533)
-- Name: user_permissions_list; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE user_permissions_list (
    username text NOT NULL,
    create_project integer,
    create_users integer,
    edit_users integer,
    remove_users integer,
    view_projects integer,
    view_users integer
);


ALTER TABLE user_permissions_list OWNER TO joshlee;

--
-- TOC entry 217 (class 1259 OID 17233)
-- Name: view_projects; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE view_projects (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.vp_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE view_projects OWNER TO joshlee;

--
-- TOC entry 218 (class 1259 OID 17246)
-- Name: view_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE view_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.vu_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE view_users OWNER TO joshlee;

SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2746 (class 0 OID 17030)
-- Dependencies: 210
-- Data for Name: add_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--



--
-- TOC entry 2747 (class 0 OID 17086)
-- Dependencies: 211
-- Data for Name: edit_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--



--
-- TOC entry 2766 (class 0 OID 17475)
-- Dependencies: 230
-- Data for Name: project_permissions_list; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--



--
-- TOC entry 2748 (class 0 OID 17110)
-- Dependencies: 212
-- Data for Name: remove_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--



--
-- TOC entry 2749 (class 0 OID 17158)
-- Dependencies: 213
-- Data for Name: view_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--



SET search_path = public, pg_catalog;

--
-- TOC entry 2745 (class 0 OID 16969)
-- Dependencies: 209
-- Data for Name: dirent; Type: TABLE DATA; Schema: public; Owner: joshlee
--



--
-- TOC entry 2736 (class 0 OID 16447)
-- Dependencies: 200
-- Data for Name: folder; Type: TABLE DATA; Schema: public; Owner: joshlee
--



--
-- TOC entry 2737 (class 0 OID 16494)
-- Dependencies: 201
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: joshlee
--



--
-- TOC entry 2735 (class 0 OID 16396)
-- Dependencies: 199
-- Data for Name: project; Type: TABLE DATA; Schema: public; Owner: joshlee
--



--
-- TOC entry 2738 (class 0 OID 16502)
-- Dependencies: 202
-- Data for Name: text; Type: TABLE DATA; Schema: public; Owner: joshlee
--



--
-- TOC entry 2739 (class 0 OID 16552)
-- Dependencies: 203
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO "user" VALUES ('admin', '21232f297a57a5a743894a0e4a801fc3', NULL, NULL, NULL, NULL);
INSERT INTO "user" VALUES ('josh', 'f94adcc3ddda04a8f34928d862f404b4', NULL, NULL, NULL, NULL);
INSERT INTO "user" VALUES ('user2', '7e58d63b60197ceb55a1c487989a3720', NULL, NULL, NULL, NULL);
INSERT INTO "user" VALUES ('user3', '92877af70a45fd6a2ed7fe81e1236b78', NULL, NULL, NULL, NULL);


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2750 (class 0 OID 17182)
-- Dependencies: 214
-- Data for Name: create_project; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO create_project VALUES ('admin', 1, 1);


--
-- TOC entry 2742 (class 0 OID 16887)
-- Dependencies: 206
-- Data for Name: create_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO create_users VALUES ('admin', 1, 1);


--
-- TOC entry 2751 (class 0 OID 17201)
-- Dependencies: 215
-- Data for Name: edit_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO edit_users VALUES ('admin', 1, 1);


--
-- TOC entry 2752 (class 0 OID 17220)
-- Dependencies: 216
-- Data for Name: remove_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO remove_users VALUES ('admin', 1, 1);


--
-- TOC entry 2767 (class 0 OID 17533)
-- Dependencies: 231
-- Data for Name: user_permissions_list; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO user_permissions_list VALUES ('josh', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO user_permissions_list VALUES ('user2', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO user_permissions_list VALUES ('user3', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 2753 (class 0 OID 17233)
-- Dependencies: 217
-- Data for Name: view_projects; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO view_projects VALUES ('admin', 1, 1);


--
-- TOC entry 2754 (class 0 OID 17246)
-- Dependencies: 218
-- Data for Name: view_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO view_users VALUES ('admin', 1, 1);


SET search_path = public, pg_catalog;

--
-- TOC entry 2779 (class 0 OID 0)
-- Dependencies: 219
-- Name: af_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('af_id_seq', 37, true);


--
-- TOC entry 2780 (class 0 OID 0)
-- Dependencies: 224
-- Name: cp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('cp_id_seq', 5, true);


--
-- TOC entry 2781 (class 0 OID 0)
-- Dependencies: 225
-- Name: cu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('cu_id_seq', 2, true);


--
-- TOC entry 2782 (class 0 OID 0)
-- Dependencies: 220
-- Name: ef_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('ef_id_seq', 32, true);


--
-- TOC entry 2783 (class 0 OID 0)
-- Dependencies: 226
-- Name: eu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('eu_id_seq', 3, true);


--
-- TOC entry 2784 (class 0 OID 0)
-- Dependencies: 208
-- Name: permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('permission_id_seq', 145, true);


--
-- TOC entry 2785 (class 0 OID 0)
-- Dependencies: 207
-- Name: permission_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('permission_seq', 3, true);


--
-- TOC entry 2786 (class 0 OID 0)
-- Dependencies: 204
-- Name: project_name; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('project_name', 1, true);


--
-- TOC entry 2787 (class 0 OID 0)
-- Dependencies: 221
-- Name: rf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('rf_id_seq', 33, true);


--
-- TOC entry 2788 (class 0 OID 0)
-- Dependencies: 222
-- Name: rp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('rp_id_seq', 2, true);


--
-- TOC entry 2789 (class 0 OID 0)
-- Dependencies: 227
-- Name: ru_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('ru_id_seq', 3, true);


--
-- TOC entry 2790 (class 0 OID 0)
-- Dependencies: 205
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('user_id_seq', 3, true);


--
-- TOC entry 2791 (class 0 OID 0)
-- Dependencies: 223
-- Name: vf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vf_id_seq', 24, true);


--
-- TOC entry 2792 (class 0 OID 0)
-- Dependencies: 228
-- Name: vp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vp_id_seq', 3, true);


--
-- TOC entry 2793 (class 0 OID 0)
-- Dependencies: 229
-- Name: vu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vu_id_seq', 2, true);


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2502 (class 2606 OID 17038)
-- Name: add_files add_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2504 (class 2606 OID 17094)
-- Name: edit_files edit_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2520 (class 2606 OID 17512)
-- Name: project_permissions_list project_permissions_list_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_pkey PRIMARY KEY (username, project_name);


--
-- TOC entry 2506 (class 2606 OID 17118)
-- Name: remove_files remove_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2508 (class 2606 OID 17166)
-- Name: view_files view_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_pkey PRIMARY KEY (permission_id);


SET search_path = public, pg_catalog;

--
-- TOC entry 2500 (class 2606 OID 17665)
-- Name: dirent dirent_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_pkey PRIMARY KEY ("UUID");


--
-- TOC entry 2488 (class 2606 OID 17667)
-- Name: folder folder_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY folder
    ADD CONSTRAINT folder_pkey PRIMARY KEY ("UUID");


--
-- TOC entry 2490 (class 2606 OID 17684)
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY image
    ADD CONSTRAINT image_pkey PRIMARY KEY ("UUID");


--
-- TOC entry 2484 (class 2606 OID 16668)
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT project_pkey PRIMARY KEY (project_name);


--
-- TOC entry 2486 (class 2606 OID 16404)
-- Name: project projects_project_name_key; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT projects_project_name_key UNIQUE (project_name);


--
-- TOC entry 2492 (class 2606 OID 17686)
-- Name: text text_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY text
    ADD CONSTRAINT text_pkey PRIMARY KEY ("UUID");


--
-- TOC entry 2494 (class 2606 OID 16562)
-- Name: user user _username_key; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT "user _username_key" UNIQUE (username);


--
-- TOC entry 2496 (class 2606 OID 16770)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (username);


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2510 (class 2606 OID 17190)
-- Name: create_project create_project_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2498 (class 2606 OID 16950)
-- Name: create_users create_user_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2514 (class 2606 OID 17227)
-- Name: remove_users remove_users_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2512 (class 2606 OID 17208)
-- Name: edit_users untitled_table_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT untitled_table_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2522 (class 2606 OID 17540)
-- Name: user_permissions_list user_permissions_list_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_pkey PRIMARY KEY (username);


--
-- TOC entry 2516 (class 2606 OID 17240)
-- Name: view_projects view_projects_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2518 (class 2606 OID 17253)
-- Name: view_users view_users_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_pkey PRIMARY KEY (permission_id);


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2575 (class 2620 OID 17298)
-- Name: add_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2580 (class 2620 OID 17302)
-- Name: edit_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2582 (class 2620 OID 17305)
-- Name: remove_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2588 (class 2620 OID 17311)
-- Name: view_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2574 (class 2620 OID 17297)
-- Name: add_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2578 (class 2620 OID 17300)
-- Name: edit_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2583 (class 2620 OID 17303)
-- Name: remove_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2586 (class 2620 OID 17309)
-- Name: view_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2577 (class 2620 OID 17516)
-- Name: add_files insert_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON add_files FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2581 (class 2620 OID 17517)
-- Name: edit_files insert_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON edit_files FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2585 (class 2620 OID 17518)
-- Name: remove_files insert_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON remove_files FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2589 (class 2620 OID 17519)
-- Name: view_files insert_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON view_files FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2576 (class 2620 OID 17299)
-- Name: add_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2579 (class 2620 OID 17301)
-- Name: edit_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2584 (class 2620 OID 17304)
-- Name: remove_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2587 (class 2620 OID 17310)
-- Name: view_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


SET search_path = public, pg_catalog;

--
-- TOC entry 2566 (class 2620 OID 17313)
-- Name: project add_project; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER add_project AFTER INSERT ON project FOR EACH ROW EXECUTE PROCEDURE give_owner_permissions();


--
-- TOC entry 2569 (class 2620 OID 17578)
-- Name: user add_user; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER add_user AFTER INSERT ON "user" FOR EACH ROW EXECUTE PROCEDURE set_user_permissions();


--
-- TOC entry 2567 (class 2620 OID 16912)
-- Name: user user_delete; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER user_delete BEFORE DELETE ON "user" FOR EACH ROW EXECUTE PROCEDURE user_permissions.prevent_admin_delete();


--
-- TOC entry 2568 (class 2620 OID 16913)
-- Name: user user_edit; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER user_edit BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE user_permissions.prevent_edit();


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2601 (class 2620 OID 17583)
-- Name: remove_users add_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER add_permission AFTER INSERT ON remove_users FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2570 (class 2620 OID 16914)
-- Name: create_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2590 (class 2620 OID 17284)
-- Name: create_project edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2595 (class 2620 OID 17287)
-- Name: edit_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2599 (class 2620 OID 17290)
-- Name: remove_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2603 (class 2620 OID 17293)
-- Name: view_projects edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2606 (class 2620 OID 17294)
-- Name: view_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2572 (class 2620 OID 16928)
-- Name: create_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2592 (class 2620 OID 17282)
-- Name: create_project grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2596 (class 2620 OID 17285)
-- Name: edit_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2600 (class 2620 OID 17289)
-- Name: remove_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2604 (class 2620 OID 17291)
-- Name: view_projects grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2608 (class 2620 OID 17295)
-- Name: view_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2593 (class 2620 OID 17580)
-- Name: create_project insert_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON create_project FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2573 (class 2620 OID 17581)
-- Name: create_users insert_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON create_users FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2597 (class 2620 OID 17582)
-- Name: edit_users insert_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON edit_users FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2605 (class 2620 OID 17584)
-- Name: view_projects insert_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON view_projects FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2609 (class 2620 OID 17585)
-- Name: view_users insert_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER insert_permission AFTER INSERT ON view_users FOR EACH ROW EXECUTE PROCEDURE add_permission();


--
-- TOC entry 2571 (class 2620 OID 16915)
-- Name: create_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2591 (class 2620 OID 17283)
-- Name: create_project remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2594 (class 2620 OID 17286)
-- Name: edit_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2598 (class 2620 OID 17288)
-- Name: remove_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2602 (class 2620 OID 17292)
-- Name: view_projects remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2607 (class 2620 OID 17296)
-- Name: view_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2531 (class 2606 OID 17049)
-- Name: add_files add_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES add_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2532 (class 2606 OID 17044)
-- Name: add_files add_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2533 (class 2606 OID 17039)
-- Name: add_files add_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2536 (class 2606 OID 17105)
-- Name: edit_files edit_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES edit_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2535 (class 2606 OID 17100)
-- Name: edit_files edit_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2534 (class 2606 OID 17095)
-- Name: edit_files edit_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2554 (class 2606 OID 17486)
-- Name: project_permissions_list project_permissions_list_add_files_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_add_files_fkey FOREIGN KEY (add_files) REFERENCES add_files(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2555 (class 2606 OID 17491)
-- Name: project_permissions_list project_permissions_list_edit_files_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_edit_files_fkey FOREIGN KEY (edit_files) REFERENCES edit_files(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2558 (class 2606 OID 17506)
-- Name: project_permissions_list project_permissions_list_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2556 (class 2606 OID 17496)
-- Name: project_permissions_list project_permissions_list_remove_files_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_remove_files_fkey FOREIGN KEY (remove_files) REFERENCES remove_files(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2553 (class 2606 OID 17481)
-- Name: project_permissions_list project_permissions_list_username _fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT "project_permissions_list_username _fkey" FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2557 (class 2606 OID 17501)
-- Name: project_permissions_list project_permissions_list_view_files_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY project_permissions_list
    ADD CONSTRAINT project_permissions_list_view_files_fkey FOREIGN KEY (view_files) REFERENCES view_files(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2539 (class 2606 OID 17129)
-- Name: remove_files remove_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES remove_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2538 (class 2606 OID 17124)
-- Name: remove_files remove_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2537 (class 2606 OID 17119)
-- Name: remove_files remove_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2542 (class 2606 OID 17177)
-- Name: view_files view_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2541 (class 2606 OID 17172)
-- Name: view_files view_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2540 (class 2606 OID 17167)
-- Name: view_files view_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


SET search_path = public, pg_catalog;

--
-- TOC entry 2529 (class 2606 OID 17013)
-- Name: dirent dirent_project_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_project_name_fkey FOREIGN KEY (project_name) REFERENCES project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2530 (class 2606 OID 17673)
-- Name: dirent dirent_super_folder_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_super_folder_fkey FOREIGN KEY (super_folder) REFERENCES folder("UUID") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2524 (class 2606 OID 17668)
-- Name: folder folder_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY folder
    ADD CONSTRAINT folder_uuid_fkey FOREIGN KEY ("UUID") REFERENCES dirent("UUID") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2525 (class 2606 OID 17678)
-- Name: image image_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY image
    ADD CONSTRAINT image_uuid_fkey FOREIGN KEY ("UUID") REFERENCES dirent("UUID") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2523 (class 2606 OID 16777)
-- Name: project project_owner _fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT "project_owner _fkey" FOREIGN KEY (owner) REFERENCES "user"(username) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 2526 (class 2606 OID 17687)
-- Name: text text_UUID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY text
    ADD CONSTRAINT "text_UUID_fkey" FOREIGN KEY ("UUID") REFERENCES dirent("UUID") ON UPDATE CASCADE ON DELETE CASCADE;


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2543 (class 2606 OID 17196)
-- Name: create_project create_project_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES create_project(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2544 (class 2606 OID 17191)
-- Name: create_project create_project_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2528 (class 2606 OID 17008)
-- Name: create_users create_user_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES create_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2527 (class 2606 OID 16931)
-- Name: create_users create_user_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2546 (class 2606 OID 17215)
-- Name: edit_users edit_user_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT edit_user_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES edit_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2548 (class 2606 OID 17259)
-- Name: remove_users remove_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES remove_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2547 (class 2606 OID 17228)
-- Name: remove_users remove_users_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2545 (class 2606 OID 17209)
-- Name: edit_users untitled_table_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT untitled_table_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2560 (class 2606 OID 17546)
-- Name: user_permissions_list user_permissions_list_create_project_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_create_project_fkey FOREIGN KEY (create_project) REFERENCES create_project(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2561 (class 2606 OID 17551)
-- Name: user_permissions_list user_permissions_list_create_users_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_create_users_fkey FOREIGN KEY (create_users) REFERENCES create_users(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2562 (class 2606 OID 17556)
-- Name: user_permissions_list user_permissions_list_edit_users_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_edit_users_fkey FOREIGN KEY (edit_users) REFERENCES edit_users(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2563 (class 2606 OID 17561)
-- Name: user_permissions_list user_permissions_list_remove_users_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_remove_users_fkey FOREIGN KEY (remove_users) REFERENCES remove_users(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2559 (class 2606 OID 17541)
-- Name: user_permissions_list user_permissions_list_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2564 (class 2606 OID 17566)
-- Name: user_permissions_list user_permissions_list_view_projects_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_view_projects_fkey FOREIGN KEY (view_projects) REFERENCES view_projects(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2565 (class 2606 OID 17571)
-- Name: user_permissions_list user_permissions_list_view_users_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY user_permissions_list
    ADD CONSTRAINT user_permissions_list_view_users_fkey FOREIGN KEY (view_users) REFERENCES view_users(permission_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 2550 (class 2606 OID 17264)
-- Name: view_projects view_projects_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_projects(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2549 (class 2606 OID 17241)
-- Name: view_projects view_projects_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2552 (class 2606 OID 17269)
-- Name: view_users view_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2551 (class 2606 OID 17254)
-- Name: view_users view_users_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2773 (class 0 OID 0)
-- Dependencies: 10
-- Name: project_permissions; Type: ACL; Schema: -; Owner: joshlee
--

GRANT USAGE ON SCHEMA project_permissions TO find_user;


--
-- TOC entry 2775 (class 0 OID 0)
-- Dependencies: 8
-- Name: user_permissions; Type: ACL; Schema: -; Owner: joshlee
--

GRANT USAGE ON SCHEMA user_permissions TO find_user;


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2778 (class 0 OID 0)
-- Dependencies: 210
-- Name: add_files; Type: ACL; Schema: project_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE add_files TO find_user;


-- Completed on 2018-02-07 18:20:05 GMT

--
-- PostgreSQL database dump complete
--

