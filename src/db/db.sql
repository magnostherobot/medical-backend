--
-- PostgreSQL database dump
--

-- Dumped from database version 10.1
-- Dumped by pg_dump version 10.0

-- Started on 2018-02-06 15:29:19 GMT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 9 (class 2615 OID 17274)
-- Name: project_permissions; Type: SCHEMA; Schema: -; Owner: joshlee
--

CREATE SCHEMA project_permissions;


ALTER SCHEMA project_permissions OWNER TO joshlee;

--
-- TOC entry 7 (class 2615 OID 16582)
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
-- TOC entry 2684 (class 0 OID 0)
-- Dependencies: 1
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 238 (class 1255 OID 17371)
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
-- TOC entry 234 (class 1255 OID 17281)
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
-- TOC entry 246 (class 1255 OID 17279)
-- Name: prevent_owner_delete(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_owner_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$declare 
var text;
begin
select owner into var from project where old.project_name = project_name;
    if var = old.username then 
    	RAISE exception 'cannot delete project owner';
	end if;
return old;
end



$$;


ALTER FUNCTION project_permissions.prevent_owner_delete() OWNER TO joshlee;

--
-- TOC entry 241 (class 1255 OID 17280)
-- Name: prevent_undefined_project_grant(); Type: FUNCTION; Schema: project_permissions; Owner: joshlee
--

CREATE FUNCTION prevent_undefined_project_grant() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
declare 
var text;
var2 text;
begin

execute format('select owner from project where $1.project_name = project_name') into var using new; 
if var = new.username then 
	return new;
end if;

execute format('select project_name from user_info.%I where $1.granted_by = permission_id',tg_table_name) into var2 using new; 
if var2 != new.project_name or new.granted_by is null or new.permission_id = new.granted_by then 
    RAISE exception 'Must be granted permission';
end if;	

return new;
end
$_$;


ALTER FUNCTION project_permissions.prevent_undefined_project_grant() OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 232 (class 1255 OID 17312)
-- Name: give_owner_permissions(); Type: FUNCTION; Schema: public; Owner: joshlee
--

CREATE FUNCTION give_owner_permissions() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$BEGIN
execute format('insert into project_permissions.add_files (username,project_name ) values ($1.owner,$1.project_name)') using new; 
execute format('insert into project_permissions.edit_files (username,project_name ) values ($1.owner,$1.project_name)') using new; 
execute format('insert into project_permissions.remove_files (username,project_name ) values ($1.owner,$1.project_name)') using new; 

execute format('insert into project_permissions.remove_project (username,project_name ) values ($1.owner,$1.project_name)') using new; 

execute format('insert into project_permissions.view_files (username,project_name ) values ($1.owner,$1.project_name)') using new; 






RETURN OLD;
END;



$_$;


ALTER FUNCTION public.give_owner_permissions() OWNER TO joshlee;

SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 252 (class 1255 OID 17370)
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
-- TOC entry 237 (class 1255 OID 16907)
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
-- TOC entry 239 (class 1255 OID 16911)
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
-- TOC entry 245 (class 1255 OID 16924)
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
-- TOC entry 250 (class 1255 OID 16726)
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
-- TOC entry 220 (class 1259 OID 17314)
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
-- TOC entry 211 (class 1259 OID 17030)
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
-- TOC entry 221 (class 1259 OID 17317)
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
-- TOC entry 212 (class 1259 OID 17086)
-- Name: edit_files; Type: TABLE; Schema: project_permissions; Owner: joshlee
--

CREATE TABLE edit_files (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.ef_id_seq'::regclass) NOT NULL,
    granted_by integer,
    project_name text NOT NULL
);


ALTER TABLE edit_files OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 222 (class 1259 OID 17320)
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
-- TOC entry 213 (class 1259 OID 17110)
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
-- TOC entry 224 (class 1259 OID 17326)
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
-- TOC entry 214 (class 1259 OID 17158)
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
-- TOC entry 200 (class 1259 OID 16447)
-- Name: folder; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE folder (
    object_id integer NOT NULL,
    folder_name pg_catalog.text DEFAULT '"new folder"'::pg_catalog.text
);


ALTER TABLE folder OWNER TO joshlee;

--
-- TOC entry 199 (class 1259 OID 16445)
-- Name: Folder _id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE "Folder _id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "Folder _id_seq" OWNER TO joshlee;

--
-- TOC entry 2689 (class 0 OID 0)
-- Dependencies: 199
-- Name: Folder _id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: joshlee
--

ALTER SEQUENCE "Folder _id_seq" OWNED BY folder.object_id;


--
-- TOC entry 225 (class 1259 OID 17329)
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
-- TOC entry 226 (class 1259 OID 17332)
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
-- TOC entry 210 (class 1259 OID 16969)
-- Name: dirent; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE dirent (
    object_id integer NOT NULL,
    super_folder integer,
    project_name pg_catalog.text
);


ALTER TABLE dirent OWNER TO joshlee;

--
-- TOC entry 209 (class 1259 OID 16967)
-- Name: dirent_object_id_seq; Type: SEQUENCE; Schema: public; Owner: joshlee
--

CREATE SEQUENCE dirent_object_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dirent_object_id_seq OWNER TO joshlee;

--
-- TOC entry 2691 (class 0 OID 0)
-- Dependencies: 209
-- Name: dirent_object_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: joshlee
--

ALTER SEQUENCE dirent_object_id_seq OWNED BY dirent.object_id;


--
-- TOC entry 227 (class 1259 OID 17335)
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
-- TOC entry 201 (class 1259 OID 16494)
-- Name: image; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE image (
    object_id integer NOT NULL,
    image_name pg_catalog.text,
    "UUID" uuid
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
-- TOC entry 198 (class 1259 OID 16396)
-- Name: project; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE project (
    project_name pg_catalog.text NOT NULL,
    "date created" date DEFAULT CURRENT_DATE,
    owner pg_catalog.text NOT NULL
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
-- TOC entry 223 (class 1259 OID 17323)
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
-- TOC entry 228 (class 1259 OID 17338)
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
    object_id integer NOT NULL,
    text_name pg_catalog.text,
    "UUID" uuid
);


ALTER TABLE text OWNER TO joshlee;

--
-- TOC entry 203 (class 1259 OID 16552)
-- Name: user; Type: TABLE; Schema: public; Owner: joshlee
--

CREATE TABLE "user" (
    username pg_catalog.text NOT NULL,
    password character(32)
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
-- TOC entry 229 (class 1259 OID 17341)
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
-- TOC entry 230 (class 1259 OID 17344)
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
-- TOC entry 215 (class 1259 OID 17182)
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
-- TOC entry 216 (class 1259 OID 17201)
-- Name: edit_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE edit_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.eu_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE edit_users OWNER TO joshlee;

--
-- TOC entry 217 (class 1259 OID 17220)
-- Name: remove_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE remove_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.ru_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE remove_users OWNER TO joshlee;

--
-- TOC entry 218 (class 1259 OID 17233)
-- Name: view_projects; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE view_projects (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.vp_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE view_projects OWNER TO joshlee;

--
-- TOC entry 219 (class 1259 OID 17246)
-- Name: view_users; Type: TABLE; Schema: user_permissions; Owner: joshlee
--

CREATE TABLE view_users (
    username text NOT NULL,
    permission_id integer DEFAULT nextval('public.vu_id_seq'::regclass) NOT NULL,
    granted_by integer
);


ALTER TABLE view_users OWNER TO joshlee;

SET search_path = public, pg_catalog;

--
-- TOC entry 2413 (class 2604 OID 16972)
-- Name: dirent object_id; Type: DEFAULT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent ALTER COLUMN object_id SET DEFAULT nextval('dirent_object_id_seq'::regclass);


--
-- TOC entry 2410 (class 2604 OID 16450)
-- Name: folder object_id; Type: DEFAULT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY folder ALTER COLUMN object_id SET DEFAULT nextval('"Folder _id_seq"'::regclass);


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2656 (class 0 OID 17030)
-- Dependencies: 211
-- Data for Name: add_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--

INSERT INTO add_files VALUES ('joshlee', 2, NULL, 'project 1');


--
-- TOC entry 2657 (class 0 OID 17086)
-- Dependencies: 212
-- Data for Name: edit_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--

INSERT INTO edit_files VALUES ('joshlee', 2, NULL, 'project 1');


--
-- TOC entry 2658 (class 0 OID 17110)
-- Dependencies: 213
-- Data for Name: remove_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--

INSERT INTO remove_files VALUES ('joshlee', 2, NULL, 'project 1');


--
-- TOC entry 2659 (class 0 OID 17158)
-- Dependencies: 214
-- Data for Name: view_files; Type: TABLE DATA; Schema: project_permissions; Owner: joshlee
--

INSERT INTO view_files VALUES ('joshlee', 2, NULL, 'project 1');


SET search_path = public, pg_catalog;

--
-- TOC entry 2655 (class 0 OID 16969)
-- Dependencies: 210
-- Data for Name: dirent; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO dirent VALUES (1, NULL, 'project 1');
INSERT INTO dirent VALUES (2, NULL, 'project 1');
INSERT INTO dirent VALUES (6, 2, NULL);
INSERT INTO dirent VALUES (7, 2, NULL);
INSERT INTO dirent VALUES (3, 1, NULL);
INSERT INTO dirent VALUES (4, 1, NULL);
INSERT INTO dirent VALUES (5, 4, NULL);
INSERT INTO dirent VALUES (33, NULL, 'project 1');
INSERT INTO dirent VALUES (34, NULL, 'project 1');
INSERT INTO dirent VALUES (36, NULL, 'project 1');
INSERT INTO dirent VALUES (60, NULL, 'project 1');


--
-- TOC entry 2645 (class 0 OID 16447)
-- Dependencies: 200
-- Data for Name: folder; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO folder VALUES (1, 'folder 1');
INSERT INTO folder VALUES (2, 'folder 2');
INSERT INTO folder VALUES (4, 'folder 3');


--
-- TOC entry 2646 (class 0 OID 16494)
-- Dependencies: 201
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO image VALUES (6, 'image3', NULL);
INSERT INTO image VALUES (7, 'image4', NULL);
INSERT INTO image VALUES (3, 'image1', NULL);
INSERT INTO image VALUES (5, 'image2', NULL);
INSERT INTO image VALUES (60, 'newimage', NULL);


--
-- TOC entry 2643 (class 0 OID 16396)
-- Dependencies: 198
-- Data for Name: project; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO project VALUES ('project 1', '2018-01-31', 'joshlee');


--
-- TOC entry 2647 (class 0 OID 16502)
-- Dependencies: 202
-- Data for Name: text; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO text VALUES (33, 'text 1', NULL);
INSERT INTO text VALUES (34, 'text 2', NULL);
INSERT INTO text VALUES (36, 'text 3', NULL);


--
-- TOC entry 2648 (class 0 OID 16552)
-- Dependencies: 203
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: joshlee
--

INSERT INTO "user" VALUES ('joshlee', 'f94adcc3ddda04a8f34928d862f404b4');
INSERT INTO "user" VALUES ('newuser', '0354d89c28ec399c00d3cb2d094cf093');
INSERT INTO "user" VALUES ('admin', '21232f297a57a5a743894a0e4a801fc3');
INSERT INTO "user" VALUES ('user3', '92877af70a45fd6a2ed7fe81e1236b78');


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2660 (class 0 OID 17182)
-- Dependencies: 215
-- Data for Name: create_project; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO create_project VALUES ('admin', 1, 1);


--
-- TOC entry 2651 (class 0 OID 16887)
-- Dependencies: 206
-- Data for Name: create_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO create_users VALUES ('admin', 1, 1);


--
-- TOC entry 2661 (class 0 OID 17201)
-- Dependencies: 216
-- Data for Name: edit_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO edit_users VALUES ('admin', 1, 1);


--
-- TOC entry 2662 (class 0 OID 17220)
-- Dependencies: 217
-- Data for Name: remove_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO remove_users VALUES ('admin', 1, 1);


--
-- TOC entry 2663 (class 0 OID 17233)
-- Dependencies: 218
-- Data for Name: view_projects; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO view_projects VALUES ('admin', 1, 1);


--
-- TOC entry 2664 (class 0 OID 17246)
-- Dependencies: 219
-- Data for Name: view_users; Type: TABLE DATA; Schema: user_permissions; Owner: joshlee
--

INSERT INTO view_users VALUES ('admin', 1, 1);


SET search_path = public, pg_catalog;

--
-- TOC entry 2703 (class 0 OID 0)
-- Dependencies: 199
-- Name: Folder _id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('"Folder _id_seq"', 17, true);


--
-- TOC entry 2704 (class 0 OID 0)
-- Dependencies: 220
-- Name: af_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('af_id_seq', 4, true);


--
-- TOC entry 2705 (class 0 OID 0)
-- Dependencies: 225
-- Name: cp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('cp_id_seq', 1, false);


--
-- TOC entry 2706 (class 0 OID 0)
-- Dependencies: 226
-- Name: cu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('cu_id_seq', 1, false);


--
-- TOC entry 2707 (class 0 OID 0)
-- Dependencies: 209
-- Name: dirent_object_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('dirent_object_id_seq', 60, true);


--
-- TOC entry 2708 (class 0 OID 0)
-- Dependencies: 221
-- Name: ef_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('ef_id_seq', 2, true);


--
-- TOC entry 2709 (class 0 OID 0)
-- Dependencies: 227
-- Name: eu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('eu_id_seq', 1, false);


--
-- TOC entry 2710 (class 0 OID 0)
-- Dependencies: 208
-- Name: permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('permission_id_seq', 145, true);


--
-- TOC entry 2711 (class 0 OID 0)
-- Dependencies: 207
-- Name: permission_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('permission_seq', 3, true);


--
-- TOC entry 2712 (class 0 OID 0)
-- Dependencies: 204
-- Name: project_name; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('project_name', 1, true);


--
-- TOC entry 2713 (class 0 OID 0)
-- Dependencies: 222
-- Name: rf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('rf_id_seq', 3, true);


--
-- TOC entry 2714 (class 0 OID 0)
-- Dependencies: 223
-- Name: rp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('rp_id_seq', 2, true);


--
-- TOC entry 2715 (class 0 OID 0)
-- Dependencies: 228
-- Name: ru_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('ru_id_seq', 1, false);


--
-- TOC entry 2716 (class 0 OID 0)
-- Dependencies: 205
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('user_id_seq', 3, true);


--
-- TOC entry 2717 (class 0 OID 0)
-- Dependencies: 224
-- Name: vf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vf_id_seq', 2, true);


--
-- TOC entry 2718 (class 0 OID 0)
-- Dependencies: 229
-- Name: vp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vp_id_seq', 1, false);


--
-- TOC entry 2719 (class 0 OID 0)
-- Dependencies: 230
-- Name: vu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: joshlee
--

SELECT pg_catalog.setval('vu_id_seq', 1, false);


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2442 (class 2606 OID 17038)
-- Name: add_files add_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2444 (class 2606 OID 17094)
-- Name: edit_files edit_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2446 (class 2606 OID 17118)
-- Name: remove_files remove_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2448 (class 2606 OID 17166)
-- Name: view_files view_files_pkey; Type: CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_pkey PRIMARY KEY (permission_id);


SET search_path = public, pg_catalog;

--
-- TOC entry 2428 (class 2606 OID 16452)
-- Name: folder Folder _pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY folder
    ADD CONSTRAINT "Folder _pkey" PRIMARY KEY (object_id);


--
-- TOC entry 2440 (class 2606 OID 16977)
-- Name: dirent dirent_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_pkey PRIMARY KEY (object_id);


--
-- TOC entry 2430 (class 2606 OID 16795)
-- Name: image image_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY image
    ADD CONSTRAINT image_pkey PRIMARY KEY (object_id);


--
-- TOC entry 2424 (class 2606 OID 16668)
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT project_pkey PRIMARY KEY (project_name);


--
-- TOC entry 2426 (class 2606 OID 16404)
-- Name: project projects_project_name_key; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT projects_project_name_key UNIQUE (project_name);


--
-- TOC entry 2432 (class 2606 OID 16797)
-- Name: text text_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY text
    ADD CONSTRAINT text_pkey PRIMARY KEY (object_id);


--
-- TOC entry 2434 (class 2606 OID 16562)
-- Name: user user _username_key; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT "user _username_key" UNIQUE (username);


--
-- TOC entry 2436 (class 2606 OID 16770)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (username);


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2450 (class 2606 OID 17190)
-- Name: create_project create_project_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2438 (class 2606 OID 16950)
-- Name: create_users create_user_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2454 (class 2606 OID 17227)
-- Name: remove_users remove_users_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2452 (class 2606 OID 17208)
-- Name: edit_users untitled_table_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT untitled_table_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2456 (class 2606 OID 17240)
-- Name: view_projects view_projects_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_pkey PRIMARY KEY (permission_id);


--
-- TOC entry 2458 (class 2606 OID 17253)
-- Name: view_users view_users_pkey; Type: CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_pkey PRIMARY KEY (permission_id);


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2496 (class 2620 OID 17298)
-- Name: add_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2500 (class 2620 OID 17302)
-- Name: edit_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2503 (class 2620 OID 17305)
-- Name: remove_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2506 (class 2620 OID 17311)
-- Name: view_files edit_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2495 (class 2620 OID 17297)
-- Name: add_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2498 (class 2620 OID 17300)
-- Name: edit_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2501 (class 2620 OID 17303)
-- Name: remove_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2504 (class 2620 OID 17309)
-- Name: view_files grant_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_project_grant();


--
-- TOC entry 2497 (class 2620 OID 17299)
-- Name: add_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON add_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2499 (class 2620 OID 17301)
-- Name: edit_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON edit_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2502 (class 2620 OID 17304)
-- Name: remove_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON remove_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


--
-- TOC entry 2505 (class 2620 OID 17310)
-- Name: view_files remove_permission; Type: TRIGGER; Schema: project_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_files FOR EACH ROW EXECUTE PROCEDURE prevent_owner_delete();


SET search_path = public, pg_catalog;

--
-- TOC entry 2489 (class 2620 OID 17313)
-- Name: project add_project; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER add_project AFTER INSERT ON project FOR EACH ROW EXECUTE PROCEDURE give_owner_permissions();


--
-- TOC entry 2490 (class 2620 OID 16912)
-- Name: user user_delete; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER user_delete BEFORE DELETE ON "user" FOR EACH ROW EXECUTE PROCEDURE user_permissions.prevent_admin_delete();


--
-- TOC entry 2491 (class 2620 OID 16913)
-- Name: user user_edit; Type: TRIGGER; Schema: public; Owner: joshlee
--

CREATE TRIGGER user_edit BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE user_permissions.prevent_edit();


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2492 (class 2620 OID 16914)
-- Name: create_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2507 (class 2620 OID 17284)
-- Name: create_project edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2511 (class 2620 OID 17287)
-- Name: edit_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2514 (class 2620 OID 17290)
-- Name: remove_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2517 (class 2620 OID 17293)
-- Name: view_projects edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2519 (class 2620 OID 17294)
-- Name: view_users edit_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER edit_permission BEFORE UPDATE ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_edit();


--
-- TOC entry 2494 (class 2620 OID 16928)
-- Name: create_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2509 (class 2620 OID 17282)
-- Name: create_project grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2512 (class 2620 OID 17285)
-- Name: edit_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2515 (class 2620 OID 17289)
-- Name: remove_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2518 (class 2620 OID 17291)
-- Name: view_projects grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2521 (class 2620 OID 17295)
-- Name: view_users grant_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER grant_permission BEFORE INSERT ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_undefined_grant();


--
-- TOC entry 2493 (class 2620 OID 16915)
-- Name: create_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON create_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2508 (class 2620 OID 17283)
-- Name: create_project remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON create_project FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2510 (class 2620 OID 17286)
-- Name: edit_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON edit_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2513 (class 2620 OID 17288)
-- Name: remove_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON remove_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2516 (class 2620 OID 17292)
-- Name: view_projects remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_projects FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


--
-- TOC entry 2520 (class 2620 OID 17296)
-- Name: view_users remove_permission; Type: TRIGGER; Schema: user_permissions; Owner: joshlee
--

CREATE TRIGGER remove_permission BEFORE DELETE ON view_users FOR EACH ROW EXECUTE PROCEDURE prevent_admin_delete();


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2467 (class 2606 OID 17049)
-- Name: add_files add_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES add_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2468 (class 2606 OID 17044)
-- Name: add_files add_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2469 (class 2606 OID 17039)
-- Name: add_files add_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY add_files
    ADD CONSTRAINT add_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2472 (class 2606 OID 17105)
-- Name: edit_files edit_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES edit_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2471 (class 2606 OID 17100)
-- Name: edit_files edit_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2470 (class 2606 OID 17095)
-- Name: edit_files edit_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_files
    ADD CONSTRAINT edit_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2475 (class 2606 OID 17129)
-- Name: remove_files remove_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES remove_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2474 (class 2606 OID 17124)
-- Name: remove_files remove_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2473 (class 2606 OID 17119)
-- Name: remove_files remove_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_files
    ADD CONSTRAINT remove_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2478 (class 2606 OID 17177)
-- Name: view_files view_files_granted_by_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_files(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2477 (class 2606 OID 17172)
-- Name: view_files view_files_project_name_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_project_name_fkey FOREIGN KEY (project_name) REFERENCES public.project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2476 (class 2606 OID 17167)
-- Name: view_files view_files_username_fkey; Type: FK CONSTRAINT; Schema: project_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_files
    ADD CONSTRAINT view_files_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


SET search_path = public, pg_catalog;

--
-- TOC entry 2466 (class 2606 OID 17013)
-- Name: dirent dirent_project_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_project_name_fkey FOREIGN KEY (project_name) REFERENCES project(project_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2465 (class 2606 OID 16988)
-- Name: dirent dirent_super_folder_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY dirent
    ADD CONSTRAINT dirent_super_folder_fkey FOREIGN KEY (super_folder) REFERENCES folder(object_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2460 (class 2606 OID 16983)
-- Name: folder folder_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY folder
    ADD CONSTRAINT folder_object_id_fkey FOREIGN KEY (object_id) REFERENCES dirent(object_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2461 (class 2606 OID 16993)
-- Name: image image_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY image
    ADD CONSTRAINT image_file_id_fkey FOREIGN KEY (object_id) REFERENCES dirent(object_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2459 (class 2606 OID 16777)
-- Name: project project_owner _fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY project
    ADD CONSTRAINT "project_owner _fkey" FOREIGN KEY (owner) REFERENCES "user"(username) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 2462 (class 2606 OID 16998)
-- Name: text text_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joshlee
--

ALTER TABLE ONLY text
    ADD CONSTRAINT text_file_id_fkey FOREIGN KEY (object_id) REFERENCES dirent(object_id) ON UPDATE CASCADE ON DELETE CASCADE;


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2479 (class 2606 OID 17196)
-- Name: create_project create_project_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES create_project(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2480 (class 2606 OID 17191)
-- Name: create_project create_project_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_project
    ADD CONSTRAINT create_project_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2464 (class 2606 OID 17008)
-- Name: create_users create_user_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES create_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2463 (class 2606 OID 16931)
-- Name: create_users create_user_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY create_users
    ADD CONSTRAINT create_user_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2482 (class 2606 OID 17215)
-- Name: edit_users edit_user_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT edit_user_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES edit_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2484 (class 2606 OID 17259)
-- Name: remove_users remove_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES remove_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2483 (class 2606 OID 17228)
-- Name: remove_users remove_users_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY remove_users
    ADD CONSTRAINT remove_users_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2481 (class 2606 OID 17209)
-- Name: edit_users untitled_table_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY edit_users
    ADD CONSTRAINT untitled_table_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2486 (class 2606 OID 17264)
-- Name: view_projects view_projects_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_projects(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2485 (class 2606 OID 17241)
-- Name: view_projects view_projects_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_projects
    ADD CONSTRAINT view_projects_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2488 (class 2606 OID 17269)
-- Name: view_users view_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES view_users(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2487 (class 2606 OID 17254)
-- Name: view_users view_users_username_fkey; Type: FK CONSTRAINT; Schema: user_permissions; Owner: joshlee
--

ALTER TABLE ONLY view_users
    ADD CONSTRAINT view_users_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2681 (class 0 OID 0)
-- Dependencies: 9
-- Name: project_permissions; Type: ACL; Schema: -; Owner: joshlee
--

GRANT USAGE ON SCHEMA project_permissions TO find_user;


--
-- TOC entry 2683 (class 0 OID 0)
-- Dependencies: 7
-- Name: user_permissions; Type: ACL; Schema: -; Owner: joshlee
--

GRANT USAGE ON SCHEMA user_permissions TO add_user;
GRANT USAGE ON SCHEMA user_permissions TO edit_user;
GRANT USAGE ON SCHEMA user_permissions TO view_project;
GRANT USAGE ON SCHEMA user_permissions TO view_user;
GRANT USAGE ON SCHEMA user_permissions TO delete_user;
GRANT USAGE ON SCHEMA user_permissions TO login_user;
GRANT USAGE ON SCHEMA user_permissions TO check_permission;
GRANT USAGE ON SCHEMA user_permissions TO find_user;


SET search_path = project_permissions, pg_catalog;

--
-- TOC entry 2685 (class 0 OID 0)
-- Dependencies: 211
-- Name: add_files; Type: ACL; Schema: project_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE add_files TO check_permission;
GRANT SELECT ON TABLE add_files TO find_user;


--
-- TOC entry 2686 (class 0 OID 0)
-- Dependencies: 212
-- Name: edit_files; Type: ACL; Schema: project_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE edit_files TO check_permission;


--
-- TOC entry 2687 (class 0 OID 0)
-- Dependencies: 214
-- Name: view_files; Type: ACL; Schema: project_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE view_files TO check_permission;


SET search_path = public, pg_catalog;

--
-- TOC entry 2688 (class 0 OID 0)
-- Dependencies: 200
-- Name: folder; Type: ACL; Schema: public; Owner: joshlee
--

GRANT INSERT ON TABLE folder TO add_file;


--
-- TOC entry 2690 (class 0 OID 0)
-- Dependencies: 210
-- Name: dirent; Type: ACL; Schema: public; Owner: joshlee
--

GRANT SELECT,INSERT ON TABLE dirent TO add_file;


--
-- TOC entry 2692 (class 0 OID 0)
-- Dependencies: 209
-- Name: dirent_object_id_seq; Type: ACL; Schema: public; Owner: joshlee
--

GRANT SELECT,USAGE ON SEQUENCE dirent_object_id_seq TO add_file;


--
-- TOC entry 2693 (class 0 OID 0)
-- Dependencies: 201
-- Name: image; Type: ACL; Schema: public; Owner: joshlee
--

GRANT ALL ON TABLE image TO add_file;


--
-- TOC entry 2694 (class 0 OID 0)
-- Dependencies: 198
-- Name: project; Type: ACL; Schema: public; Owner: joshlee
--

GRANT INSERT ON TABLE project TO create_project;
GRANT SELECT ON TABLE project TO view_project;


--
-- TOC entry 2695 (class 0 OID 0)
-- Dependencies: 202
-- Name: text; Type: ACL; Schema: public; Owner: joshlee
--

GRANT INSERT ON TABLE text TO add_file;


--
-- TOC entry 2696 (class 0 OID 0)
-- Dependencies: 203
-- Name: user; Type: ACL; Schema: public; Owner: joshlee
--

GRANT INSERT ON TABLE "user" TO add_user;
GRANT SELECT ON TABLE "user" TO view_user;
GRANT SELECT,DELETE ON TABLE "user" TO delete_user;
GRANT SELECT ON TABLE "user" TO login_user;


SET search_path = user_permissions, pg_catalog;

--
-- TOC entry 2697 (class 0 OID 0)
-- Dependencies: 215
-- Name: create_project; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE create_project TO check_permission;


--
-- TOC entry 2698 (class 0 OID 0)
-- Dependencies: 206
-- Name: create_users; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE create_users TO check_permission;


--
-- TOC entry 2699 (class 0 OID 0)
-- Dependencies: 216
-- Name: edit_users; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE edit_users TO check_permission;


--
-- TOC entry 2700 (class 0 OID 0)
-- Dependencies: 217
-- Name: remove_users; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE remove_users TO check_permission;


--
-- TOC entry 2701 (class 0 OID 0)
-- Dependencies: 218
-- Name: view_projects; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE view_projects TO check_permission;


--
-- TOC entry 2702 (class 0 OID 0)
-- Dependencies: 219
-- Name: view_users; Type: ACL; Schema: user_permissions; Owner: joshlee
--

GRANT SELECT ON TABLE view_users TO check_permission;


-- Completed on 2018-02-06 15:29:19 GMT

--
-- PostgreSQL database dump complete
--

