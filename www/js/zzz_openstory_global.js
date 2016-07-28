var _remote_domain = "https://AdventureMashup.com/";
var _remote_domain_mongo = "http://localhost:3000/";
var _ajax_url_precache = _remote_domain + "api/Serv/pre_cache";

var _ajax_url_get_AMI = _remote_domain + "api/Serv/get_AMI";

var _ajax_url_newsess = _remote_domain + "api/Serv/new_sess";
var _ajax_url_checksess = _remote_domain + "api/Serv/check_sess";

var _ajax_url_firstscene = _remote_domain + "api/Serv/get_first_scene";
var _ajax_url_globalvars = _remote_domain + "api/Serv/get_global_vars";
var _ajax_url_save_globalvars = _remote_domain + "api/Serv/save_global_vars";
var _ajax_url_get_objects = _remote_domain + "api/Serv/get_scenes";
var _ajax_url_save_scene = _remote_domain + "api/Serv/save_scene";
var _ajax_url_set_first_scene = _remote_domain + "api/Serv/set_first_scene";
var _ajax_url_delete_scene = _remote_domain + "api/Serv/delete_scene";
var _ajax_url_delete_image = _remote_domain + "api/Serv/delete_image";
var _ajax_url_upload_css = _remote_domain + "api/Serv/upload_css";
var _ajax_url_store_set = _remote_domain + "api/Serv/store_set";
var _ajax_url_store_get = _remote_domain + "api/Serv/store_get";
var _ajax_url_store_del = _remote_domain + "api/Serv/store_del";
var _ajax_url_get_unique_titles = _remote_domain + "api/Serv/get_unique_titles";
var c1 = "071a9cdf-fda2-49ad-8af2-ea6eb8cc03b1";
var g1 = "2755a4b5-6912-430f-b2e3-dc54d05686e2";
var g2 = "DAF97B7E-7B94-4836-B71B-D2205EC77F17";
var g3 = "13deee94-a0ff-4620-a027-b88b42b2b65f";
var g4 = "5c663147-6513-4a70-aa08-e0eaee9bc36c";
var g5 = "904c1eab-872d-4325-9886-f8387ec0e05e";
var _story_name = "_071a9cdf_fda2_49ad_8af2_ea6eb8cc03b1_story_";
var _story_name_settings = "_071a9cdf_fda2_49ad_8af2_ea6eb8cc03b1_story_settings_";

var _ajax_url_write_scene_mongo = _remote_domain_mongo + "api/write_scene";//done

var _AM_css_file=document.createElement("link");
_AM_css_file.setAttribute("rel", "stylesheet");
_AM_css_file.setAttribute("type", "text/css");
_AM_css_file.setAttribute("href",  _remote_domain + "api/Serv/get_css/" + c1);
document.getElementsByTagName("head")[0].appendChild(_AM_css_file);
