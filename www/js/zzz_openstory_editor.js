window.__offline = 1;
window._AM_loaded = false;

(function (_AME, $, undefined) {

__ready = 0;

_AME.cur_select = {};
_AME.cur_img_scene_select = {};

is_global_prop = false;
is_scene_selected = false;
is_image_selected = false;
is_shape_selected = false;
is_add_new_node = false;
add_node_type = "";
keypress_timer = null;

mouse_grab_type = null;
last_pencil_position = {};
last_pan_position = {};
last_pan_margin = {};
pan_mouse_is_down = false;
pencil_mouse_is_down = false;
pencil_mouse_is_dragging = true; //convert line command to curve.
last_viewBox = [];
last_svg_path_obj = {};
last_center = {};
last_rad = null;
last_rotate_position = {};
last_angle = 0;
new_angle = 0;

box_size = 5.0;
stroke_width = 1;
box_color = 'pink';

circle_point_size = 2.0;
circle_ctrl_size = 2.0;
circle_move_size = 2.0;
circle_grab_size = 3.0;

circle_stroke_width = 1.0;

circle_point_color = 'red';
circle_ctrl_color  = 'green';
circle_move_color = 'blue';
circle_grab_color = 'darkgreen';

snap_range = 2.0;
last_point_snapped = false;

__dependency = 0;

paste_bin = {};
paste_bin_comp = [];
vid_pos_chg = null;
prev_range_from = null;
prev_range_to = null;
playing = 0;
new_clip_box = {};
is_mouse_down = false;
last_path_position = {};
last_path = {};
keypress_image_group = null;
last_div_position = {};
is_div_drag = false;
last_div_width = 0;
video_src_change_handle = null;
css_change_handle = null;

svg_pencil_active = false;
svg_pan_active = false;
svg_rotate_active = false;
svg_scale_active = false;
svg_copy_active = false;

function show_working() {   
    document.getElementById('working').setAttribute('class', 'working_holder_show');
}

function hide_working() {
    document.getElementById('working').setAttribute('class', 'working_holder_hide');
}

function dep_check() {
    if (__dependency > 3) {
        getAdventure_Mashup();
        wireup();
    } else {
        setTimeout(function () { dep_check(); }, 1000);
    }
}

_AME.initOnLoad = function initOnLoad() {
    //get global variables
    show_working();
    $.get(_ajax_url_globalvars + "/" + c1,
    function (data) {
        (new Function(data))();
        __dependency++;
    });

    $.get(_ajax_url_precache + "/" + g1 + "/" + session_id + "/" + g3,
    function (data) {
        if (data == "false") {
            window.location.href = "index.html";
        } else {
            (new Function(data))();
            __dependency++;          
        }
    });

    //get first scene
    $.get(_ajax_url_firstscene + "/" + c1,
    function (data) {
        (new Function(data))();
        __dependency++;
    });


    //get story_settings.
    session_id = store.get_local("_AM.session_id"); //set session id.           
    if (session_id) {
        $.ajax({
            type: "GET",
            url: _ajax_url_store_get + "/" + c1 + "/" + session_id + "/" + _story_name_settings,
            success: function (data) {
                if (data != 'false') {
                    //get all saved menu settings.
                    window._story_settings = JSON.parse(data);
                }
                __dependency++;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert('[loading settings] Connection to server has failed.\nPlease try reloading the page.');
                __dependency++;
            }
        });
    } else {
        __dependency++;
    }

    setTimeout(function () { dep_check(); }, 1000);
}

function getAdventure_Mashup() {
    if (!window._AM_loaded) {
        if (__offline) {
            if (!window._AM_loaded) {
                var fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", "www/js/openstory_client.js");
                document.getElementsByTagName("head")[0].appendChild(fileref);

                fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", "www/js/openstory_init.js");
                document.getElementsByTagName("head")[0].appendChild(fileref);

                __ready++;
                readyCheck();
            }
        } else {
            if (!window._AM_loaded) {
                $.get(_ajax_url_precache + "/" + g1 + "/" + session_id + "/" + g2,
                function (data) {
                    if (data == "false") {
                        show_sign_in();
                    } else {
                        (new Function(data))();
                        __ready++;
                        readyCheck();
                    }
                });
            } else {
                __ready++;
                readyCheck();
            }
        }

        //setTimeout(function () { readyCheck(); }, 1000);
    }
}



function readyCheck() {
    if (__ready > 0 && window._AM_loaded) {
        _AM.editor = true;
        _AM.init_defaults(video_int_width, video_int_height, video_int_font_size, f1);
        _AME.get_objects("~", true, document.getElementById('object_results'), 'all_objects', _AME.cur_select, _AME.explorer_click_scene, _AME.explorer_click_image, true);
        restore_menu_settings();
        _AM.init_save_data();        
    } else {
        setTimeout(function () { readyCheck(); }, 1000);
    }
}


function set_image_selected_scene(scene_obj, li, selected) {
    if (selected.scene_obj != scene_obj) {
        if (selected.html) {
            selected.html.setAttribute('style', '');
        }
        selected.html = li;
        li.setAttribute('style', 'background-color:#454545');

        _AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene = scene_obj.uidGroup;
        _AME.cur_select.image_obj.to_scene_video_src = scene_obj.video_src;
        selected.scene_obj = scene_obj;

        $('#scene_search').val(selected.scene_obj.name);
    } else {


        if (selected.html) {
            selected.html.setAttribute('style', '');
        }

        _AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene = null;
        _AME.cur_select.image_obj.to_scene_video_src = "";

        selected.scene_obj = null;
    }
}

function set_selected_scene(scene_obj, li, selected, cont) {
    var p = cont.parentNode.parentNode.parentNode;
    if (scene_obj != selected.scene_obj || is_image_selected == true) {
        //previous thing selected was an image, or not the same scene.
        is_scene_selected = true;
        is_image_selected = false;

        if (selected['html' + p.id]) {
            selected['html' + p.id].setAttribute('style', '');
        }
        selected['html' + p.id] = li;
        li.setAttribute('style', 'background-color:#454545');
        selected.scene_obj = scene_obj;
        $('#obj_search').val(scene_obj.name);
        selected.image_obj = {};
    } else {
        //deselect.
        is_scene_selected = false;
        is_image_selected = false;

        if (selected['html' + p.id]) {
            selected['html' + p.id].setAttribute('style', '');
        }

        selected.scene_obj = null;
        selected.image_obj = null;
    }
}

function set_selected_image(scene_obj, image_obj, li, selected, cont) {
    var p = cont.parentNode.parentNode.parentNode;
    if (image_obj != selected.image_obj) {
        is_scene_selected = false;
        is_image_selected = true;

        if (selected['html' + p.id]) {
            selected['html' + p.id].setAttribute('style', '');
        }
        selected['html' + p.id] = li;
        li.setAttribute('style', 'background-color:#454545');
        selected.scene_obj = scene_obj;
        $('#obj_search').val(scene_obj.name);
        selected.image_obj = image_obj;

        if (svg_copy_active) {           
            var that = selected.image_obj.uidGroup.replace(/-/g, '_');
            paste_bin[that] = JSON.stringify(_AME.cur_select.image_obj);
            paste_bin[that].uidGroup = '';
            var keypair = { title: selected.image_obj.title, uidGroup: null, reference: selected.image_obj.uidGroup }
            paste_bin_comp.push(keypair)
        }
    } else {
        is_scene_selected = false;
        is_image_selected = false;

        if (svg_copy_active) {            
            for (var i = 0; i < paste_bin_comp.length; i++) {
                if (paste_bin_comp[i].uidGroup == selected.image_obj.uidGroup) {
                    delete paste_bin[selected.image_obj.uidGroup.replace(/-/g, '_')];
                    paste_bin_comp.slice(i);
                }
            }
        }

        if (selected['html' + p.id]) {
            selected['html' + p.id].setAttribute('style', '');
        }

        selected.scene_obj = null;
        selected.image_obj = null;
    }
}

function set_selected_shape(shape_obj, li, selected) {  
    if (shape_obj != selected.shape_obj) {
        is_shape_selected = true;

        if (selected.html) {
            selected.html.setAttribute('style', '');
        }
        selected.html = li;
        li.setAttribute('style', 'background-color:#454545');

        selected.shape_obj = shape_obj;
    } 
}

var show_working_count;

function config_video_scene(selected) {
    var vid1, vid2;
    show_working_count = 0;
    //config video.
    vid1 = _AM.video_streams[0];      
    vid1.setAttribute('preload', 'auto');
    vid1.setAttribute('type', 'video/mp4');
    if (selected.scene_obj.video_src && selected.scene_obj.video_src != "") {
        show_working();
        show_working_count++;
        $(vid1).on('canplay', function (event) {
            $(vid1).on('seeked', function (event) {
                show_working_count--;
                if (show_working_count == 0) {
                    hide_working();
                }
                $(this).off(event);
            });
            vid1.currentTime = selected.scene_obj.loop_until;
            document.getElementById('position').setAttribute('max', vid1.duration * 100);
            document.getElementById('tposition').value = selected.scene_obj.start_time * 100;
            document.getElementById('range_from').setAttribute('max', vid1.duration * 100);
            document.getElementById('range_from').value = selected.scene_obj.loop_until * 100;
            document.getElementById('trange_from').value = selected.scene_obj.loop_until;
            $(this).off(event);
        });
        $(vid1).on('error', function (event) {
            //if it fails to play hopefully this is called.
            hide_working();
        });

        document.getElementById('range_from_bar').setAttribute('class', 'range_show');
        _AM.video_streams[0].setAttribute('class', 'story_video_editor_show');
        vid1.src = "www/video1/" + selected.scene_obj.video_src;

    } else {
        document.getElementById('range_from_bar').setAttribute('class', 'range_hide');
        _AM.video_streams[0].setAttribute('class', 'story_video_editor_hide');
    }
  
    vid2 = _AM.video_streams[1];
    vid2.setAttribute('preload', 'auto');
    vid2.setAttribute('type', 'video/mp4');
    if (selected.scene_obj.video_src && selected.scene_obj.video_src != "") {
        show_working();
        show_working_count++;
        $(vid2).on('canplay', function (event) {
            $(vid2).on('seeked', function (event) {
                show_working_count--;
                if (show_working_count == 0) {
                    hide_working();
                }
                $(this).off(event);
            });
            vid2.currentTime = selected.scene_obj.loop_goto;
            document.getElementById('range_to').setAttribute('max', vid2.duration * 100);
            document.getElementById('range_to').value = selected.scene_obj.loop_goto * 100;
            document.getElementById('trange_to').value = selected.scene_obj.loop_goto;
            $(this).off(event);
        });

        $(vid2).on('error', function (event) {
            //if it fails to play hopefully this is called.
            hide_working();
        });

        document.getElementById('range_to_bar').setAttribute('class', 'range_show');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_fade_hide');
        vid2.src = "www/video1/" + selected.scene_obj.video_src;
    } else {
        document.getElementById('range_to_bar').setAttribute('class', 'range_hide');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_hide');
    }
}

function config_image_scene(selected) {
    //config video.
    var vid1, vid2;
    
    vid1 = _AM.video_streams[0];
    vid1.setAttribute('preload', 'auto');
    vid1.setAttribute('type', 'video/mp4');
    if (selected.scene_obj.video_src && selected.scene_obj.video_src != "") {
        show_working();
        $(vid1).on('canplay', function (event) {
            $(vid1).on('seeked', function (event) {
                hide_working();
                $(this).off(event);
            });

            //time position is set in the canplay event attached in the reset_image_group_display() function.
            //vid1.currentTime = selected.scene_obj.start_time;
            document.getElementById('position').setAttribute('max', vid1.duration * 100);
            document.getElementById('tposition').value = selected.scene_obj.start_time;
            document.getElementById('range_from').setAttribute('max', vid1.duration * 100);
            document.getElementById('range_from').value = selected.image_obj.to_scene_from * 100;
            document.getElementById('trange_from').value = selected.image_obj.to_scene_from;
            $(this).off(event);
        });

        $(vid1).on('error', function (event) {
            //if it fails to play hopefully this is called.
            hide_working();
        });

        document.getElementById('range_from_bar').setAttribute('class', 'range_show');
        _AM.video_streams[0].setAttribute('class', 'story_video_editor_show');
        vid1.src = "www/video1/" + selected.scene_obj.video_src;
    } else {
        document.getElementById('range_from_bar').setAttribute('class', 'range_hide');
        _AM.video_streams[0].setAttribute('class', 'story_video_editor_hide');
    }


    vid2 = _AM.video_streams[1];
    vid2.setAttribute('preload', 'auto');
    vid2.setAttribute('type', 'video/mp4');
    if (selected.image_obj.to_scene_video_src && selected.image_obj.to_scene_video_src != "") {
        $(vid2).on('canplay', function (event) {
            //time position is set here for vid2 and is not handled by reset_image_group_display() function.
            vid2.currentTime = selected.image_obj.to_scene_goto;
            document.getElementById('range_to').setAttribute('max', vid2.duration * 100);
            document.getElementById('range_to').value = selected.image_obj.to_scene_goto * 100;
            document.getElementById('trange_to').value = selected.image_obj.to_scene_goto;
            $(this).off(event);
        });

        document.getElementById('range_to_bar').setAttribute('class', 'range_show');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_fade_hide');
        vid2.src = "www/video1/" + selected.image_obj.to_scene_video_src;
    } else {
        document.getElementById('range_from_bar').setAttribute('class', 'range_hide');
        document.getElementById('range_to_bar').setAttribute('class', 'range_hide');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_hide');
    }
}


function config_image_to_scene() {
    var vid2;
    show_working_count = 0;
    vid2 = _AM.video_streams[1];
    vid2.setAttribute('preload', 'auto');
    vid2.setAttribute('type', 'video/mp4');
    if (_AME.cur_select.image_obj.to_scene_video_src && _AME.cur_select.image_obj.to_scene_video_src != "") {
        show_working();
        show_working_count++;
        $(vid2).on('canplay', function (event) {
            $(vid2).on('seeked', function (event) {
                show_working_count--;
                if (show_working_count == 0) {
                    hide_working();
                }
                $(this).off(event);
            });

            vid2.currentTime = _AME.cur_select.image_obj.to_scene_goto;
            document.getElementById('range_to').setAttribute('max', vid2.duration * 100);
            document.getElementById('range_to').value = _AME.cur_select.image_obj.to_scene_goto * 100;
            document.getElementById('trange_to').value = _AME.cur_select.image_obj.to_scene_goto;
            $(this).off(event);
        });

        document.getElementById('range_from_bar').setAttribute('class', 'range_show');
        document.getElementById('range_to_bar').setAttribute('class', 'range_show');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_fade_hide');
        vid2.src = "www/video1/" + _AME.cur_select.image_obj.to_scene_video_src;
    } else {
        document.getElementById('range_from_bar').setAttribute('class', 'range_hide');
        document.getElementById('range_to_bar').setAttribute('class', 'range_hide');
        _AM.video_streams[1].setAttribute('class', 'story_video_editor_hide');
    }
}

_AME.image_prop_click_scene = function image_prop_click_scene(event) {
    set_image_selected_scene(event.data.scene, event.data.list_item, event.data.sel);
    config_image_to_scene();
}

function clear_play_setting() {

    var vid = _AM.video_streams[0];
    if (vid) {
        vid.pause();
    }
    _AM.scene_paused = 0;
    document.getElementById('play_pause1').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
    document.getElementById('play_pause2').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
    document.getElementById('play_pause3').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
}

_AME.explorer_click_scene = function explorer_click_scene(event) {
    clear_play_setting();
    set_selected_scene(event.data.scene, event.data.list_item, event.data.sel, this);
    if (_AME.cur_select.scene_obj != null) {
        _AM.reset_AM();
        _AM.editor_init();
        _AM.init_save_data(_story_name + '_editor');
     
        $('#story_svg').on('mousemove', mouse_move);
        $('#story_svg').on('mousedown', mouse_down);
        $('#story_svg').on('mouseup', mouse_up);
        $(_AM.video_streams[0]).on('timeupdate', function () { video_progress(); });
        $(_AM.video_streams[0]).on('ended', function () { clear_play_setting(); });

        _AM.scenes = [];
        _AM.scenes[0] = {};
        _AM.scenes[0][_AME.cur_select.scene_obj.title] = _AME.cur_select.scene_obj;
        _AM.set_current_scene(_AM.scenes[0][_AME.cur_select.scene_obj.title]);
        _AM.images = _AME.cur_select.scene_obj.images;
        config_video_scene(event.data.sel);
    }
}

_AME.explorer_click_image = function explorer_click_image(event) {
    clear_play_setting();
    set_selected_image(event.data.scene, event.data.image, event.data.list_item, event.data.sel, this);
    reset_image_group_display();
}

function remove_points_for_move() {
    $('#svg_points').remove();
    $('#svg_clip_box_points').remove();
}

function show_points(img, t) {
    //draw the path points.
    $('#svg_points').remove();
    $('#svg_clip_box_points').remove();
    $('#svg_move').remove();
    $('#svg_bound').remove();
    $('#svg_bound_circle').remove();

    if (img.triggered) {
        //add group first.
        var svg_g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg_g.setAttributeNS(null, 'id', 'svg_points');
      
        img.real_start_time = img.start_time;
        var tmp_image = _AM.get_animated_image(img, t);      

        var circle;
        var last_command = "";

        var count_ctrl_points = 0;
        var count_move_points = 0;
        var count_real_points = 0;

        //calc bounding box, with out initial M. If it is displayed or not.
        var svg_path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); //Create a path in SVG's namespace
        svg_path.setAttributeNS(null, 'd', convert_path_obj_to_d(tmp_image, 2)); //Set path's data   
        svg_path.setAttributeNS(null, 'class', anim_shape_class + '_path');
        document.getElementById('story_svg').appendChild(svg_path);
        var bbox = svg_path.getBBox();
        document.getElementById('story_svg').removeChild(svg_path);

        //need to modify this to include the handles.
        if (svg_rotate_active) {            
            //draw circle to grab.
            var svg_bound_circle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            svg_bound_circle.setAttributeNS(null, 'id', 'svg_bound_circle');           

            var rot_circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            rot_circle.setAttributeNS(null, 'id', 'circle_rotate');
            rot_circle.setAttributeNS(null, 'cx', last_center.x);
            rot_circle.setAttributeNS(null, 'cy', last_center.y);
            rot_circle.setAttributeNS(null, 'r', last_rad);
            rot_circle.setAttributeNS(null, 'stroke', 'black');
            rot_circle.setAttributeNS(null, 'stroke-width', stroke_width);
            rot_circle.setAttributeNS(null, 'fill', 'none');
            svg_bound_circle.appendChild(rot_circle);
            
            var s;
            var c;
            //calc location of handle 1.
            var start_x = last_rad;
            var start_y = 0;
            
            if (new_angle) {
                s = Math.sin(new_angle - last_angle);
                c = Math.cos(new_angle - last_angle);
            } else {
                s = 0;
                c = 1;
            }
                                   
            // rotate point
            var new_x = start_x * c - start_y * s;
            var new_y = start_x * s + start_y * c;

            // translate point back to be back around original center:
            start_x = new_x + last_center.x;
            start_y = new_y + last_center.y;

            var recthandle1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle1.setAttributeNS(null, 'id', 'svg_handle_rect_right');
            recthandle1.setAttributeNS(null, 'data-rad', 0.0);
            recthandle1.setAttributeNS(null, 'x', start_x - box_size/2.0);
            recthandle1.setAttributeNS(null, 'y', start_y - box_size/2.0);
            recthandle1.setAttributeNS(null, 'width', box_size);
            recthandle1.setAttributeNS(null, 'height', box_size);
            recthandle1.setAttributeNS(null, 'stroke', 'black');
            recthandle1.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle1.setAttributeNS(null, 'fill', box_color);
            svg_bound_circle.appendChild(recthandle1);            
            $(recthandle1).on('mousedown', function (event) { mouse_grab_rotate_box(event, this); });


            start_x = 0;
            start_y = -last_rad;
            if (new_angle) {
                s = Math.sin(new_angle - last_angle);
                c = Math.cos(new_angle - last_angle);
            } else {
                s = 0;
                c = 1;
            }
            // rotate point
            new_x = start_x * c - start_y * s;
            new_y = start_x * s + start_y * c;

            // translate point back to be back around original center:
            start_x = new_x + last_center.x;
            start_y = new_y + last_center.y;

            var recthandle2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle2.setAttributeNS(null, 'id', 'svg_handle_rect_top');
            recthandle2.setAttributeNS(null, 'data-rad', 3.0*Math.PI/2.0);
            recthandle2.setAttributeNS(null, 'x', start_x - box_size / 2.0);
            recthandle2.setAttributeNS(null, 'y', start_y - box_size / 2.0);
            recthandle2.setAttributeNS(null, 'width', box_size);
            recthandle2.setAttributeNS(null, 'height', box_size);
            recthandle2.setAttributeNS(null, 'stroke', 'black');
            recthandle2.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle2.setAttributeNS(null, 'fill', box_color);
            svg_bound_circle.appendChild(recthandle2);
            $(recthandle2).on('mousedown', function (event) { mouse_grab_rotate_box(event, this); });


            start_x = -last_rad;
            start_y = 0;
            if (new_angle) {
                s = Math.sin(new_angle - last_angle);
                c = Math.cos(new_angle - last_angle);
            } else {
                s = 0;
                c = 1;
            }
            // rotate point
            new_x = start_x * c - start_y * s;
            new_y = start_x * s + start_y * c;

            // translate point back to be back around original center:
            start_x = new_x + last_center.x;
            start_y = new_y + last_center.y;

            var recthandle3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle3.setAttributeNS(null, 'id', 'svg_handle_rect_left');
            recthandle3.setAttributeNS(null, 'data-rad', Math.PI);
            recthandle3.setAttributeNS(null, 'x', start_x - box_size / 2.0);
            recthandle3.setAttributeNS(null, 'y', start_y - box_size / 2.0);
            recthandle3.setAttributeNS(null, 'width', box_size);
            recthandle3.setAttributeNS(null, 'height', box_size);
            recthandle3.setAttributeNS(null, 'stroke', 'black');
            recthandle3.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle3.setAttributeNS(null, 'fill', box_color);
            svg_bound_circle.appendChild(recthandle3);
            $(recthandle3).on('mousedown', function (event) { mouse_grab_rotate_box(event, this); });

            start_x = 0;
            start_y = last_rad;
            if (new_angle) {
                s = Math.sin(new_angle - last_angle);
                c = Math.cos(new_angle - last_angle);
            } else {
                s = 0;
                c = 1;
            }
            // rotate point
            new_x = start_x * c - start_y * s;
            new_y = start_x * s + start_y * c;

            // translate point back to be back around original center:
            start_x = new_x + last_center.x;
            start_y = new_y + last_center.y;

            var recthandle4 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle4.setAttributeNS(null, 'id', 'svg_handle_rect_bottom');
            recthandle4.setAttributeNS(null, 'data-rad',Math.PI/2.0);
            recthandle4.setAttributeNS(null, 'x', start_x - box_size / 2.0);
            recthandle4.setAttributeNS(null, 'y', start_y - box_size / 2.0);
            recthandle4.setAttributeNS(null, 'width', box_size);
            recthandle4.setAttributeNS(null, 'height', box_size);
            recthandle4.setAttributeNS(null, 'stroke', 'black');
            recthandle4.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle4.setAttributeNS(null, 'fill', box_color);
            svg_bound_circle.appendChild(recthandle4);
            $(recthandle4).on('mousedown', function (event) { mouse_grab_rotate_box(event, this); });

            document.getElementById('story_svg').appendChild(svg_bound_circle);
        } else if (svg_scale_active) {
            //show bounding box, with handles for scaling and rotating.
            var svg_bound = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            svg_bound.setAttributeNS(null, 'id', 'svg_bound');

            //add main bounding rec.
            var rectbound = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectbound.setAttributeNS(null, 'id', 'svg_bounding_rect');
            rectbound.setAttributeNS(null, 'x', bbox.x);
            rectbound.setAttributeNS(null, 'y', bbox.y);
            rectbound.setAttributeNS(null, 'width', bbox.width);
            rectbound.setAttributeNS(null, 'height', bbox.height);
            rectbound.setAttributeNS(null, 'stroke', 'black');
            rectbound.setAttributeNS(null, 'stroke-width', stroke_width);
            rectbound.setAttributeNS(null, 'fill', 'none');
            svg_bound.appendChild(rectbound);

            var recthandle1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle1.setAttributeNS(null, 'id', 'svg_handle_rect_top_left');
            recthandle1.setAttributeNS(null, 'x', bbox.x - box_size / 2.0);
            recthandle1.setAttributeNS(null, 'y', bbox.y - box_size / 2.0);
            recthandle1.setAttributeNS(null, 'width', box_size);
            recthandle1.setAttributeNS(null, 'height', box_size);
            recthandle1.setAttributeNS(null, 'stroke', 'black');
            recthandle1.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle1.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle1);
            $(recthandle1).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_bottom_right')) });
            //$(recthandle1).on('mouseup', mouse_up);

            var recthandle2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle2.setAttributeNS(null, 'id', 'svg_handle_rect_top_middle');
            recthandle2.setAttributeNS(null, 'x', bbox.x - box_size / 2.0 + bbox.width / 2.0);
            recthandle2.setAttributeNS(null, 'y', bbox.y - box_size / 2.0);
            recthandle2.setAttributeNS(null, 'width', box_size);
            recthandle2.setAttributeNS(null, 'height', box_size);
            recthandle2.setAttributeNS(null, 'stroke', 'black');
            recthandle2.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle2.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle2);
            $(recthandle2).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_bottom_middle')) });
            //$(recthandle2).on('mouseup', mouse_up);

            var recthandle3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle3.setAttributeNS(null, 'id', 'svg_handle_rect_top_right');
            recthandle3.setAttributeNS(null, 'x', bbox.x - box_size / 2.0 + bbox.width);
            recthandle3.setAttributeNS(null, 'y', bbox.y - box_size / 2.0);
            recthandle3.setAttributeNS(null, 'width', box_size);
            recthandle3.setAttributeNS(null, 'height', box_size);
            recthandle3.setAttributeNS(null, 'stroke', 'black');
            recthandle3.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle3.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle3);
            $(recthandle3).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_bottom_left')) });
            //$(recthandle3).on('mouseup', mouse_up);

            var recthandle4 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle4.setAttributeNS(null, 'id', 'svg_handle_rect_middle_right');
            recthandle4.setAttributeNS(null, 'x', bbox.x - box_size / 2.0 + bbox.width);
            recthandle4.setAttributeNS(null, 'y', bbox.y - box_size / 2.0 + bbox.height / 2.0);
            recthandle4.setAttributeNS(null, 'width', box_size);
            recthandle4.setAttributeNS(null, 'height', box_size);
            recthandle4.setAttributeNS(null, 'stroke', 'black');
            recthandle4.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle4.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle4);
            $(recthandle4).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_middle_left')) });
            //$(recthandle4).on('mouseup', mouse_up);

            var recthandle5 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle5.setAttributeNS(null, 'id', 'svg_handle_rect_bottom_right');
            recthandle5.setAttributeNS(null, 'x', bbox.x - box_size / 2.0 + bbox.width);
            recthandle5.setAttributeNS(null, 'y', bbox.y - box_size / 2.0 + bbox.height);
            recthandle5.setAttributeNS(null, 'width', box_size);
            recthandle5.setAttributeNS(null, 'height', box_size);
            recthandle5.setAttributeNS(null, 'stroke', 'black');
            recthandle5.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle5.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle5);
            $(recthandle5).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_top_left')) });
            //$(recthandle5).on('mouseup', mouse_up);

            var recthandle6 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle6.setAttributeNS(null, 'id', 'svg_handle_rect_bottom_middle');
            recthandle6.setAttributeNS(null, 'x', bbox.x - box_size / 2.0 + bbox.width / 2.0);
            recthandle6.setAttributeNS(null, 'y', bbox.y - box_size / 2.0 + bbox.height);
            recthandle6.setAttributeNS(null, 'width', box_size);
            recthandle6.setAttributeNS(null, 'height', box_size);
            recthandle6.setAttributeNS(null, 'stroke', 'black');
            recthandle6.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle6.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle6);
            $(recthandle6).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_top_middle')) });
            //$(recthandle6).on('mouseup', mouse_up);

            var recthandle7 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle7.setAttributeNS(null, 'id', 'svg_handle_rect_bottom_left');
            recthandle7.setAttributeNS(null, 'x', bbox.x - box_size / 2.0);
            recthandle7.setAttributeNS(null, 'y', bbox.y - box_size / 2.0 + bbox.height);
            recthandle7.setAttributeNS(null, 'width', box_size);
            recthandle7.setAttributeNS(null, 'height', box_size);
            recthandle7.setAttributeNS(null, 'stroke', 'black');
            recthandle7.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle7.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle7);
            $(recthandle7).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_top_right')) });
            //$(recthandle7).on('mouseup', mouse_up);

            var recthandle8 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            recthandle8.setAttributeNS(null, 'id', 'svg_handle_rect_middle_left');
            recthandle8.setAttributeNS(null, 'x', bbox.x - box_size / 2.0);
            recthandle8.setAttributeNS(null, 'y', bbox.y - box_size / 2.0 + bbox.height / 2.0);
            recthandle8.setAttributeNS(null, 'width', box_size);
            recthandle8.setAttributeNS(null, 'height', box_size);
            recthandle8.setAttributeNS(null, 'stroke', 'black');
            recthandle8.setAttributeNS(null, 'stroke-width', stroke_width);
            recthandle8.setAttributeNS(null, 'fill', box_color);
            svg_bound.appendChild(recthandle8);
            $(recthandle8).on('mousedown', function (event) { mouse_grab_scale_box(this, document.getElementById('svg_handle_rect_middle_right')) });
            //$(recthandle8).on('mouseup', mouse_up);

            document.getElementById('story_svg').appendChild(svg_bound);
        } else {
            for (var i = 0; i < tmp_image.num.length; i++) {
                if (!(i % 2)) {
                    var circle = null;
                    switch (tmp_image.com[i]) {
                        case " M":
                            count_ctrl_points = 0;
                            break;
                        case " L":
                            count_ctrl_points = 0;
                            break;
                        case " C":
                            //(x1 y1 x2 y2 x y)+
                            //cubic Bézier curve from the current point to (x,y) using (x1,y1) as the control point at the beginning of the curve and (x2,y2) as the control point at the end of the curve
                            count_ctrl_points = 2;
                            break;
                        case " S":
                            //(x2 y2 x y)+
                            // cubic Bézier curve from the current point to (x,y). (x2,y2) is the second control point 
                            count_ctrl_points = 1;
                            break;
                        case " Q":
                            //(x1 y1 x y)+
                            // a quadratic Bézier curve from the current point to (x,y) using (x1,y1) as the control point
                            count_ctrl_points = 1;
                            break;
                        case " T":
                            //(x y)+
                            // quadratic Bézier curve from the current point to (x,y). 
                            break;
                            //case "A":
                            //(rx ry x-axis-rotation large-arc-flag sweep-flag x y)+
                            //Draws an elliptical arc from the current point to (x, y). The size and orientation of the ellipse are defined by two radii (rx, ry) and an x-axis-rotation, which indicates how the ellipse as a whole is rotated relative to the current coordinate system. The center (cx, cy) of the ellipse is calculated automatically to satisfy the constraints imposed by the other parameters. large-arc-flag and sweep-flag contribute to the automatic calculations and help determine how the arc is drawn.
                            //break;

                        default:
                            //intentionally left blank.
                            break;
                    }

                    if (count_ctrl_points <= 0) {
                        count_real_points++;

                        //determine bounding box.
                        /*if (i > 0) {
                            if (tmp_image.num[i] < min_x) {
                                min_x = tmp_image.num[i];
                            } else if (tmp_image.num[i] > max_x) {
                                max_x = tmp_image.num[i];
                            }
    
                            if (tmp_image.num[i + 1] < min_y) {
                                min_y = tmp_image.num[i + 1];
                            } else if (tmp_image.num[i + 1] > max_y) {
                                max_y = tmp_image.num[i + 1];
                            }
                        }*/

                        if ($('#img_show_points').prop('checked')) {
                            circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                            circle.setAttributeNS(null, 'id', 'select_points_' + i);
                            circle.setAttributeNS(null, 'data-idx', i);
                            circle.setAttributeNS(null, 'cx', tmp_image.num[i]);
                            
                            if (tmp_image.com[i] == " M") {
                                circle.setAttributeNS(null, 'r', circle_move_size);
                                circle.setAttributeNS(null, 'stroke', 'black');
                                circle.setAttributeNS(null, 'stroke-width', circle_stroke_width);

                                circle.setAttributeNS(null, 'fill', circle_move_color);
                            } else {
                                circle.setAttributeNS(null, 'r', circle_point_size);
                                circle.setAttributeNS(null, 'stroke', 'black');
                                circle.setAttributeNS(null, 'stroke-width', circle_stroke_width);

                                circle.setAttributeNS(null, 'fill', circle_point_color);
                            }

                            $(circle).on('mousedown', mouse_grab_point);
                            $(circle).on('mouseup', mouse_up);
                        }
                    } else if (count_ctrl_points > 0 && $('#img_show_ctrl_points').prop('checked')) {
                        circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        circle.setAttributeNS(null, 'id', 'select_points_' + i);
                        circle.setAttributeNS(null, 'data-idx', i);
                        circle.setAttributeNS(null, 'cx', tmp_image.num[i]);
                        circle.setAttributeNS(null, 'r', circle_ctrl_size);

                        circle.setAttributeNS(null, 'stroke', 'black');
                        circle.setAttributeNS(null, 'stroke-width', circle_stroke_width);
                        circle.setAttributeNS(null, 'fill', circle_ctrl_color);
                        $(circle).on('mousedown', mouse_grab_point);
                        $(circle).on('mouseup', mouse_up);
                    }

                    count_ctrl_points--;

                } else if (circle) {
                    circle.setAttributeNS(null, 'cy', tmp_image.num[i]);
                    //cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red"
                    svg_g.appendChild(circle);
                }
            }

            document.getElementById('story_svg').appendChild(svg_g);
            if (img.sent) {
                var svg_g_clip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                svg_g_clip.setAttributeNS(null, 'id', 'svg_clip_box_points');

                rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

                rect.setAttributeNS(null, 'id', 'svg_clip_box_rect');
                rect.setAttributeNS(null, 'x', img.sent_clip_box[0]);
                rect.setAttributeNS(null, 'y', img.sent_clip_box[1]);
                rect.setAttributeNS(null, 'width', img.sent_clip_box[2] - img.sent_clip_box[0]);
                rect.setAttributeNS(null, 'height', img.sent_clip_box[3] - img.sent_clip_box[1]);
                rect.setAttributeNS(null, 'stroke', 'black');
                rect.setAttributeNS(null, 'stroke-width', circle_stroke_width);
                rect.setAttributeNS(null, 'fill', 'none');

                svg_g_clip.appendChild(rect);
                if ($('#img_show_handle_point').prop('checked')) {
                    circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttributeNS(null, 'id', 'move_clip_box');
                    circle.setAttributeNS(null, 'cx', img.sent_clip_box[0] + (img.sent_clip_box[2] - img.sent_clip_box[0]) / 2.0);
                    circle.setAttributeNS(null, 'cy', img.sent_clip_box[1] + (img.sent_clip_box[3] - img.sent_clip_box[1]) / 2.0);
                    circle.setAttributeNS(null, 'r', circle_grab_size);
                    circle.setAttributeNS(null, 'stroke', 'black');
                    circle.setAttributeNS(null, 'stroke-width', circle_stroke_width);
                    circle.setAttributeNS(null, 'fill', circle_grab_color);
                    $(circle).on('mousedown', mouse_grab_clip_box);
                    $(circle).on('mouseup', mouse_up);
                    svg_g_clip.appendChild(circle);
                }
                document.getElementById('story_svg').appendChild(svg_g_clip);
            }

            //find center of temp_img
            if ($('#img_show_handle_point').prop('checked')) {
                var svg_move = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                svg_move.setAttributeNS(null, 'id', 'svg_move');

                circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttributeNS(null, 'id', 'move_path');
                circle.setAttributeNS(null, 'cx', (bbox.x + (bbox.width / 2.0)).toFixed(0));
                circle.setAttributeNS(null, 'cy', (bbox.y + (bbox.height / 2.0)).toFixed(0));
                circle.setAttributeNS(null, 'r', circle_grab_size);
                circle.setAttributeNS(null, 'stroke', 'black');
                circle.setAttributeNS(null, 'stroke-width', circle_stroke_width);
                circle.setAttributeNS(null, 'fill', circle_grab_color);
                $(circle).on('mousedown', mouse_grab_path);
                $(circle).on('mouseup', mouse_up);

                svg_move.appendChild(circle);
                document.getElementById('story_svg').appendChild(svg_move);
            }

        }
        //end whole path grab.

        //var svg_elem = document.getElementById('story_svg')
        //svg_elem.insertBefore(svg_g, svg_elem.childNodes[0])
    }
}

_AME.add_time_frame = function add_time_frame() {
    //create empty shape object;
    var vid = _AM.video_streams[0];
    if (vid.paused) {
        var shp = {};
        _AME.cur_select.image_obj.real_start_time = _AME.cur_select.image_obj.start_time;
        var tmp_shape = _AM.get_animated_image(_AME.cur_select.image_obj, parseFloat(vid.currentTime.toFixed(4)));
        if (_AME.cur_select.image_obj.start_time) {
            shp.time = parseFloat((vid.currentTime - _AME.cur_select.image_obj.start_time).toFixed(4));
        } else {
            shp.time = parseFloat(vid.currentTime.toFixed(4));
        }
        shp.num = tmp_shape.num;
        shp.com = tmp_shape.com;

        /*$('#img_shape_time').val(shp.time);*/
        $('#img_animate_shape').val(JSON.stringify(shp));

        var loc_id = 0;
        var found = false;
        //find where to insert it in the array based on time.
        for (var i = _AME.cur_select.image_obj.animate_shape.length - 1; i >= 0 ; i--) {
            if (_AME.cur_select.image_obj.animate_shape[i].time < shp.time) {
                //just past position to insert.
                _AME.cur_select.image_obj.animate_shape.splice(i + 1, 0, shp);
                loc_id = i + 1;
                found = true;
                break;
            }
        }
        if (!found) {
            loc_id = 0;
            _AME.cur_select.image_obj.animate_shape.splice(0, 0, shp);
        }

        _AME.cur_select.image_obj.animate_duration = parseFloat(_AME.cur_select.image_obj.animate_shape[_AME.cur_select.image_obj.animate_shape.length - 1].time.toFixed(4));

        get_time_frames(_AME.cur_select.image_obj.animate_shape, document.getElementById('time_select'), _AME.click_time_frame, _AME.cur_select, true);
        set_selected_shape(_AME.cur_select.image_obj.animate_shape[loc_id], document.getElementById('time_select_' + loc_id), _AME.cur_select);
        update_animate_image(1);
    }


}

function update_animate_image(s_pause) {
    var test_image;
    for (var key in _AM.images) {
        if (_AM.images.hasOwnProperty(key)) {
            test_image = _AM.images[key];
            //if (test_image.scene_title == current_scene.name) {
            if (test_image.triggered && test_image.image_group == _AME.cur_select.image_obj.image_group) { 
                //image needs to be animating if it has an animation.
                //if (test_image.is_animating) {
                _AM.anim_image_helper(test_image, s_pause);
                //} 
            }
        }
    }
}

//TODO: wire this up.
function delete_time_frame(event) {
    if (confirm('Are you sure you want to delete this time frame?')) {
        //clear the other time frames.  
        if (event.data.idx != 0) {
            _AME.cur_select.image_obj.animate_shape.splice(event.data.idx, 1);

            _AME.cur_select.shape_obj = null;
            //need to update the time frame list.
            get_time_frames(_AME.cur_select.image_obj.animate_shape, document.getElementById('time_select'), _AME.click_time_frame, _AME.cur_select, true);
            set_selected_shape(_AME.cur_select.image_obj.animate_shape[0], document.getElementById('time_select_0'), _AME.cur_select);
            update_animate_image(1);
        } else {
            _AME.cur_select.image_obj.animate_shape[0] = { time: 0, num: [0, 0], com: [" M", " "] };
        }
    }
}

_AME.click_time_frame = function click_time_frame(event) {
    if (_AME.cur_select.image_obj.start_time) {
        _AM.video_streams[0].currentTime = event.data.shp[event.data.idx].time + _AME.cur_select.image_obj.start_time;
    } else {
        _AM.video_streams[0].currentTime = event.data.shp[event.data.idx].time;
    }
    mouse_grab_type = "";
    is_mouse_down = false;
    _AME.cur_select.image_obj.animate_duration = parseFloat(_AME.cur_select.image_obj.animate_shape[_AME.cur_select.image_obj.animate_shape.length - 1].time.toFixed(4));
    set_selected_shape(event.data.shp[event.data.idx], event.data.list_item, event.data.sel);
    update_animate_image(1);

    /*$('#img_shape_time').val(event.data.shp[event.data.idx].time);*/
    $('#img_animate_shape').val(JSON.stringify(event.data.shp[event.data.idx]));
}

function get_time_frames(animate_shape, where, click_time_frame, selected, can_delete) {
    $(where).empty();
    if (animate_shape) {
        var ul = document.createElement('ul');
        for (var i = 0; i < animate_shape.length; i++) {
            var item = animate_shape[i];

            var li = document.createElement('li');
            li.setAttribute('id', where.getAttribute('id') + '_' + i);
            //$(li).html("<span class='glyphicon glyphicon-time' aria-hidden='true'></span> " + parseFloat(item.time).toFixed(4));
            //$(li).on('click', { sel: selected, shp: animate_shape, idx: i, list_item: li }, click_time_frame);

            var d0 = document.createElement('div');

            $(d0).html("<span class='glyphicon glyphicon-time' aria-hidden='true'></span> " + parseFloat(item.time).toFixed(4));
            $(d0).on('click', { sel: selected, shp: animate_shape, idx: i, list_item: li }, click_time_frame);
            d0.setAttribute("style", "display:inline");

            li.appendChild(d0);

            if (can_delete) {
                var d2 = document.createElement('div');
                d2.setAttribute("style", "display:inline");

                var a1 = document.createElement('a');
                a1.setAttribute('style', 'float:right; padding-right:1px;');

                var s1 = document.createElement('span');
                s1.setAttribute('class', 'glyphicon glyphicon-remove-circle');
                s1.setAttribute('aria-hidden', 'true');

                $(a1).append(s1);

                $(d2).append(a1);
                $(li).append(d2);

                $(s1).on('click', { sel: selected, shp: animate_shape, idx: i, list_item: li }, delete_time_frame);
            }


            $(ul).append(li);
        }
        $(where).append(ul);
    }
}

_AME.set_default_image = function set_default_image(title) {
    $('#default_scene_image').val(title);
    _AME.cur_select.scene_obj.default_scene_image_title = title;
}

function get_images(where) {
    var res = 'all_objects'
    var el = document.getElementById(where);
    $(el).empty();    
    for (var key in _AME.cur_select.scene_obj.images) {
        if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
            var itm = _AME.cur_select.scene_obj.images[key];
            var ili = document.createElement('li');
            
            $(ili).html("<a href='' onclick=\"_AME.set_default_image('" + itm.title + "'); return false;\">" + itm.title + "</a>");
            $(el).append(ili);
        }
    }
}

_AME.get_objects = function get_objects(search_filter, inc_images, where, res, selected, click_scene, click_image, can_delete) {
    if (search_filter == "") {
        search_filter = '~';
    }
    //$.get(_ajax_url_get_objects + "/" + catalog_id + "/" + session_id + "/" + search_filter,
    show_working();
    $.ajax({
        url: _ajax_url_get_objects + "/" + catalog_id + "/" + session_id + "/" + search_filter,
        contentType: "application/json; charset=utf-8",
        dataType: "json",

        success: function (data) {
            //(new Function(data))();
            $(where).empty();
            if (data != 'false') {
                window[res] = JSON.parse(data);
                //load them into list.
                var count = 0;
                var f_scene;
                var ul = document.createElement('ul');
                for (var key in window[res]) {
                    if (window[res].hasOwnProperty(key)) {
                        count++;
                        var item = window[res][key];
                        f_scene = item;
                        var li = document.createElement('li');
                        var d0 = document.createElement('div');

                        $(d0).html("<span class='glyphicon glyphicon-film' aria-hidden='true'></span>" + item.name);
                        $(d0).on('click', { sel: selected, scene: item, list_item: li }, click_scene)
                        d0.setAttribute("style", "display:inline");
                        li.appendChild(d0);

                        if (can_delete) {
                            var d3 = document.createElement('div');
                            d3.setAttribute("style", "display:inline")
                            $(d3).html("<a style='float:right; padding-right:1px;'><span class='glyphicon glyphicon-remove-circle' aria-hidden='true' onclick='_AME.delete_scene_or_image();' ></span></a>");
                            li.appendChild(d3);
                        }

                        //$(li).html("<span class='glyphicon glyphicon-film' aria-hidden='true'></span>" + item.name);
                        $(ul).append(li);
                        //$(li).on('click', { sel: selected, scene: item, list_item: li }, click_scene)

                        item.next_scene = null;
                        item.video_src1 = _AM.video_path_1 + item.video_src;
                        item.video_src1_is_precached = false;
                        item.video_src2 = _AM.video_path_2 + item.video_src;
                        item.video_src2_is_precached = false;

                        item.precache_scenes_array = null;
                        item.is_scenes_precached = false;

                        item.next_scene_time_precache = item.end_time - (_AM.scene_cache_video_time + _AM.scene_sync_video_time);
                        item.next_scene_time = item.end_time - (_AM.scene_sync_video_time);
                        item.next_scene_goto = null;
                        item.change_scene_called = false;

                        if (!item.goto) {
                            item.goto = item.start_time + _AM.scene_sync_video_time; //can not be less than the time required for video sync up.
                        }

                        if (!item.loop_until) {
                            item.loop_until = item.next_scene_time_precache;
                        }

                        //check goto and loop_until are valid.
                        if (item.goto + _AM.scene_cache_video_time + _AM.scene_sync_video_time <= item.loop_until && item.goto - _AM.scene_sync_video_time >= 0 && item.goto >= item.start_time) {

                        } else {
                            //raise error, but try to use it anyway.
                            alert('Scene "' + item.name + '" has invalid parameters');
                        }

                        if (item.loop_until <= item.next_scene_time_precache) {

                        } else {
                            //raise error, but try to use it anyway.
                            alert('Scene "' + item.name + '" has invalid parameters');
                        }

                        item.is_loop = true;
                        item.is_loop_ready = false;

                        item.current_image;
                        item.current_image_idx;

                        if (inc_images) {
                            for (var key2 in window[res][key].images) {
                                if (window[res][key].images.hasOwnProperty(key2)) {
                                    var itm = window[res][key].images[key2];

                                    /*if (itm.sent_clip_box) {
                                        itm.sent_display_lines = Math.floor((itm.sent_clip_box[3] - itm.sent_clip_box[1]) / (_AM.video_intrinsic_font_size + 2 * _AM.scene_text_ver_spacing));
                                    } else {
                                        itm.sent_display_lines = 0;
                                    }*/

                                    //itm.animate_duration
                                    if (itm.animate_shape && itm.animate_shape[itm.animate_shape.length - 1]) {
                                        itm.animate_duration = parseFloat(itm.animate_shape[itm.animate_shape.length - 1].time.toFixed(4)); 
                                    }

                                    //override scramble setting so it is displayed anyway in editor.                                    
                                    itm.sent_is_scramble = 0;

                                    var ili = document.createElement('li');
                                    var d1 = document.createElement('div');
                                    $(d1).html("<span class='glyphicon glyphicon-picture' aria-hidden='true'></span>" + itm.title);
                                    $(d1).on('click', { sel: selected, scene: item, image: itm, list_item: ili }, click_image);
                                    d1.setAttribute("style", "display:inline");
                                    //$(ili).html("<span class='glyphicon glyphicon-picture' aria-hidden='true'></span>" + itm.title);
                                    //$(ili).on('click', { sel: selected, scene: item, image: itm, list_item: ili }, click_image)
                                    ili.appendChild(d1);
                                    if (can_delete) {
                                        var d2 = document.createElement('div');
                                        d2.setAttribute("style", "display:inline")
                                        $(d2).html("<a style='float:right; padding-right:1px;'><span class='glyphicon glyphicon-remove-circle' aria-hidden='true' onclick='_AME.delete_scene_or_image();' ></span></a>");
                                        ili.appendChild(d2);
                                    }

                                    ili.setAttribute('class', 'prop_list_indent')
                                    $(ul).append(ili);
                                }
                            }
                        }
                    }
                }

                if (count == 1 && is_image_selected) {
                    $('#scene_search').val(f_scene.name);
                }

                /*$(results).each(function (index, item) {
                    
                });*/

                $(where).append(ul);
            } else {
                _AME.cur_select.scene_obj = null;
                _AME.cur_select.image_obj = null;
            }
            hide_working();
        }        
    });
}

_AME.show_object_search = function show_object_search() {
    document.getElementById('object_search').setAttribute('class', 'show_prop');

    document.getElementById('image_prop').setAttribute('class', 'hide_prop');
    document.getElementById('scene_prop').setAttribute('class', 'hide_prop');
    document.getElementById('story_prop').setAttribute('class', 'hide_prop');

    document.getElementById('object_nav').setAttribute('style', '');
    document.getElementById('image_nav').setAttribute('style', 'display:none;');
    document.getElementById('scene_nav').setAttribute('style', 'display:none;');
    document.getElementById('story_nav').setAttribute('style', 'display:none;');

    is_global_prop = false;
}

_AME.show_prop = function show_prop() {
    is_global_prop = false;
    if (is_scene_selected) {
        show_scene_prop();
    } else if (is_image_selected) {
        show_image_prop();
    }
}

_AME.show_story_prop = function show_story_prop() {
    document.getElementById('object_search').setAttribute('class', 'hide_prop');
    document.getElementById('image_prop').setAttribute('class', 'hide_prop');
    document.getElementById('scene_prop').setAttribute('class', 'hide_prop');
    document.getElementById('story_prop').setAttribute('class', 'show_prop');

    document.getElementById('object_nav').setAttribute('style', 'display:none;');
    document.getElementById('image_nav').setAttribute('style', 'display:none;');
    document.getElementById('scene_nav').setAttribute('style', 'display:none;');
    document.getElementById('story_nav').setAttribute('style', '');

    $('#story_movie_size').val(video_int_width + "x" + video_int_height);
    $('#story_width').val(video_int_width);
    $('#story_height').val(video_int_height);
    $('#story_font_size').val(video_int_font_size);

    is_global_prop = true;
}

function show_scene_prop() {
    document.getElementById('object_search').setAttribute('class', 'hide_prop');
    document.getElementById('image_prop').setAttribute('class', 'hide_prop');
    document.getElementById('scene_prop').setAttribute('class', 'show_prop');
    document.getElementById('story_prop').setAttribute('class', 'hide_prop');

    document.getElementById('object_nav').setAttribute('style', 'display:none;');
    document.getElementById('image_nav').setAttribute('style', 'display:none;');
    document.getElementById('scene_nav').setAttribute('style', '');
    document.getElementById('story_nav').setAttribute('style', 'display:none;');

    //*** TO DO: Working here to fill in the text boxes with the selected data.
    $('#scene_name').val(_AME.cur_select.scene_obj.name);
    $('#scene_start_time').val(_AME.cur_select.scene_obj.start_time);
    $('#scene_end_time').val(_AME.cur_select.scene_obj.end_time);
    $('#scene_loop_until').val(_AME.cur_select.scene_obj.loop_until);
    $('#scene_loop_goto').val(_AME.cur_select.scene_obj.loop_goto);
    $('#scene_video_src').val(_AME.cur_select.scene_obj.video_src);

    if (_AME.cur_select.scene_obj.apply_loop_fade) {
        document.getElementById('scene_loop_fade').checked = true;
    } else {
        document.getElementById('scene_loop_fade').checked = false;
    }

    if (_AME.cur_select.scene_obj.apply_scene_fade) {
        document.getElementById('scene_scene_fade').checked = true;
    } else {
        document.getElementById('scene_scene_fade').checked = false;
    }

    $('#default_scene_image').val(_AME.cur_select.scene_obj.default_scene_image_title);
    $('#scene_auto_func').val(_AME.cur_select.scene_obj.auto_change_scene_func);
    $('#scene_show_func').val(_AME.cur_select.scene_obj.scene_show_func);
    $('#scene_hide_func').val(_AME.cur_select.scene_obj.scene_hide_func);
    $('#scene_comm_bar_func').val(_AME.cur_select.scene_obj.scene_comm_bar_func);

    if (_AME.cur_select.scene_obj.end_scene) {
        document.getElementById('end_scene').checked = true;
    } else {
        document.getElementById('end_scene').checked = false;
    }

    get_images('default_scene_image_group');
    if (_AME.cur_select.scene_obj.loop_until >= 0 && _AME.cur_select.scene_obj.loop_until <= _AM.video_streams[0].duration) {
        _AM.video_streams[0].currentTime = _AME.cur_select.scene_obj.loop_until
    }
    if (_AME.cur_select.scene_obj.loop_goto >= 0 && _AME.cur_select.scene_obj.loop_goto <= _AM.video_streams[0].duration) {
        _AM.video_streams[1].currentTime = _AME.cur_select.scene_obj.loop_goto
    }
}

function show_image_prop() {
    if (is_image_selected) {
        get_image_groups('image_group1', 'img_image_group');
        get_image_groups('image_group2', 'img_next_image_group');

        document.getElementById('object_search').setAttribute('class', 'hide_prop');
        document.getElementById('image_prop').setAttribute('class', 'show_prop');
        document.getElementById('scene_prop').setAttribute('class', 'hide_prop');
        document.getElementById('story_prop').setAttribute('class', 'hide_prop');

        document.getElementById('object_nav').setAttribute('style', 'display:none;');
        document.getElementById('image_nav').setAttribute('style', '');
        document.getElementById('scene_nav').setAttribute('style', 'display:none;');
        document.getElementById('story_nav').setAttribute('style', 'display:none;');

        $('#img_title').val(_AME.cur_select.image_obj.title);
        $('#img_start_time').val(_AME.cur_select.image_obj.start_time);
        $('#img_end_time').val(_AME.cur_select.image_obj.end_time);
        $('#img_image_src').val(_AME.cur_select.image_obj.image_src);
        $('#img_width').val(_AME.cur_select.image_obj.width);
        $('#img_height').val(_AME.cur_select.image_obj.height);
        //$('#img_animate_shape').val(JSON.stringify(_AME.cur_select.image_obj.animate_shape));
        $('#img_name_of_person').val(_AME.cur_select.image_obj.name_of_person);
        $('#img_sentence').val(convert_sent_obj_to_string(_AME.cur_select.image_obj.sent));
        //$('#img_sentence').off();
        //$('#img_sentence').on('keyup paste', sentence_change);

        $('#img_disp_lines').val(_AME.cur_select.image_obj.sent_display_lines);
        //$('#img_disp_lines').on('keyup paste', sentence_change); //this is a calculated value... and only determined after the sentence is drawn.

        //$('#img_clip_box').val(JSON.stringify(_AME.cur_select.image_obj.sent_clip_box));
        $('#img_animate_shape_class').val(_AME.cur_select.image_obj.animate_shape_class);
        $('#img_image_group').val(_AME.cur_select.image_obj.image_group);
        $('#img_next_image_group').val(_AME.cur_select.image_obj.next_image_group);
        $('#img_hide_image_groups').val(_AME.cur_select.image_obj.hide_image_groups);
        //$('#img_can_select').val(_AME.cur_select.image_obj.can_select);
        if (_AME.cur_select.image_obj.sent_can_select) {
            document.getElementById('img_can_select').checked = true;
        } else {
            document.getElementById('img_can_select').checked = false;
        }

        if ("editor_revealed_idx" in _AME.cur_select.image_obj) {
            $('#img_revealed_idx').val(_AME.cur_select.image_obj.editor_revealed_idx);
        } else {
            $('#img_revealed_idx').val(_AME.cur_select.image_obj.sent_revealed_idx);
            _AME.cur_select.image_obj.editor_revealed_idx = _AME.cur_select.image_obj.sent_revealed_idx;
        }
        

        //$('#img_can_select').val(_AME.cur_select.image_obj.is_scramble);
        if (_AME.cur_select.image_obj.editor_is_scramble) {
            document.getElementById('img_is_scramble').checked = true;
        } else {
            document.getElementById('img_is_scramble').checked = false;
        }

        $('#img_karma').val(_AME.cur_select.image_obj.karma);
        $('#img_needed').val(_AME.cur_select.image_obj.needed);

        //$('#img_loop_animate').val(_AME.cur_select.image_obj.loop_animate);
        if (_AME.cur_select.image_obj.loop_animate) {
            document.getElementById('img_loop_animate').checked = true;
        } else {
            document.getElementById('img_loop_animate').checked = false;
        }

        if (_AME.cur_select.image_obj.hide_all_images) {
            document.getElementById('img_hide_all_images').checked = true;
        } else {
            document.getElementById('img_hide_all_images').checked = false;
        }

        if (_AME.cur_select.image_obj.pause_while_wait) {
            document.getElementById('img_pause_while_wait').checked = true;
        } else {
            document.getElementById('img_pause_while_wait').checked = false;
        }

        if (_AME.cur_select.image_obj.done_waiting) {
            document.getElementById('img_done_waiting').checked = true;
        } else {
            document.getElementById('img_done_waiting').checked = false;
        }

        $('#img_prop_bag').val(_AME.cur_select.image_obj.prop_bag);
        $('#img_prop_bag_scene_change').val(_AME.cur_select.image_obj.prop_bag_scene_change);

        $('#img_change_from').val(_AME.cur_select.image_obj.to_scene_from);
        $('#img_change_to').val(_AME.cur_select.image_obj.to_scene_goto);

        

        if (_AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene) {
            $('#scene_search').val(_AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene);
            _AME.get_objects($('#scene_search').val(), false, document.getElementById('img_scene_results'), 'img_scene_objects', _AME.cur_img_scene_select, _AME.image_prop_click_scene, null);
        } else {
            $('#scene_search').val('');
            $('#img_scene_results').empty();
            //_AME.get_objects($('#scene_search').val(), false, document.getElementById('img_scene_results'), 'img_scene_objects', _AME.cur_img_scene_select, _AME.image_prop_click_scene, null);
        }

        $('#img_scale_to_scene').val(_AME.cur_select.image_obj.scale_to_scene);
        $('#img_offset_x_next_scene').val(_AME.cur_select.image_obj.off_set_x_to_scene);
        $('#img_offset_y_next_scene').val(_AME.cur_select.image_obj.off_set_y_to_scene);

        $('#img_show_sound').val(_AME.cur_select.image_obj.image_show_sound);
        $('#img_show_func').val(_AME.cur_select.image_obj.image_show_func);
        
        $('#img_select_sound').val(_AME.cur_select.image_obj.image_select_sound);
        $('#img_select_func').val(_AME.cur_select.image_obj.image_select_func);
        $('#img_hide_func').val(_AME.cur_select.image_obj.image_hide_func);

        get_time_frames(_AME.cur_select.image_obj.animate_shape, document.getElementById('time_select'), _AME.click_time_frame, _AME.cur_select, true);
        _AME.cur_select.shape_obj = null;
        set_selected_shape(_AME.cur_select.image_obj.animate_shape[0], document.getElementById('time_select_0'), _AME.cur_select);

        if (_AME.cur_select.image_obj.start_time > 0 && _AME.cur_select.image_obj.animate_shape[0].time + _AME.cur_select.image_obj.start_time < _AM.video_streams[0].duration) {
            _AM.video_streams[0].currentTime = _AME.cur_select.image_obj.animate_shape[0].time + _AME.cur_select.image_obj.start_time;
        } else {
            _AM.video_streams[0].currentTime = _AME.cur_select.image_obj.animate_shape[0].time;
        }
        update_animate_image(1);
    }
}

function video_pos_playback_change() {
    clearTimeout(vid_pos_chg);
    vid_pos_chg = setTimeout(function () {
        try {
            var vid = _AM.video_streams[0]; //document.getElementById('story_vid');
            if (!vid.seeking && vid.paused) {
                vid.currentTime = document.getElementById('position').value / 100.00;
                document.getElementById('tposition').value = document.getElementById('position').value / 100.00;
            }
        } catch (e) {
            video_pos_playback_change();
        }
    }, 800);
}


function video_pos_change() {
    vid_pos_chg = clearTimeout(vid_pos_chg);
    setTimeout(function () {
        try {
            var vid = _AM.video_streams[0]; // document.getElementById('story_vid');
            if (is_image_selected || (is_scene_selected && (parseInt(document.getElementById('range_from').value) > parseInt(document.getElementById('range_to').value)))) {
                if (!vid.seeking) {
                    vid.currentTime = document.getElementById('range_from').value / 100.00;
                    prev_range_from = document.getElementById('range_from').value;
                    document.getElementById('trange_from').value = vid.currentTime;
                    if (is_scene_selected) {
                        _AME.cur_select.scene_obj.loop_until = vid.currentTime;
                        $('#scene_loop_until').val(_AME.cur_select.scene_obj.loop_until);
                        //$('#scene_loop_goto').val(_AME.cur_select.scene_obj.loop_goto);
                    } else if (is_image_selected) {
                        _AME.cur_select.image_obj.to_scene_from = vid.currentTime;
                        $('#img_change_from').val(_AME.cur_select.image_obj.to_scene_from);
                        //$('#scene_loop_goto').val(_AME.cur_select.image_obj.to_scene_goto);
                    }
                }
            } else {
                if (prev_range_from) {
                    document.getElementById('range_from').value = prev_range_from;
                }
            }
        } catch (e) {
            video_pos_change();
        }
    }, 800);
}

function video2_pos_change() {
    clearTimeout(vid_pos_chg);
    vid_pos_chg = setTimeout(function () {
        try {
            var vid2 = _AM.video_streams[1]; //document.getElementById('story_to_vid');
            if (is_image_selected || (is_scene_selected && (parseInt(document.getElementById('range_to').value) < parseInt(document.getElementById('range_from').value)))) {
                if (!vid2.seeking) {
                    vid2.currentTime = document.getElementById('range_to').value / 100.00;
                    prev_range_to = document.getElementById('range_to').value;
                    document.getElementById('trange_to').value = vid2.currentTime;
                    if (is_scene_selected) {
                        _AME.cur_select.scene_obj.loop_goto = vid2.currentTime;
                        //$('#scene_loop_until').val(_AME.cur_select.scene_obj.loop_until);
                        $('#scene_loop_goto').val(_AME.cur_select.scene_obj.loop_goto);
                    } else if (is_image_selected) {
                        _AME.cur_select.image_obj.to_scene_goto = vid2.currentTime;
                        //$('#scene_loop_goto').val(_AME.cur_select.image_obj.to_scene_from);
                        $('#img_change_to').val(_AME.cur_select.image_obj.to_scene_goto);
                    }
                }
            } else {
                if (prev_range_to) {
                    document.getElementById('range_to').value = prev_range_to;
                }
            }
        } catch (e) {
            video2_pos_change();
        }
    }, 800);
}

_AME.play_pause = function play_pause() {
    var vid = _AM.video_streams[0];
    if (vid.paused) {
        //_AM.set_current_scene();
        //build images.

        vid.play();
        _AM.scene_paused = 0;
        update_animate_image();
        document.getElementById('play_pause1').innerHTML = "<span class='glyphicon glyphicon-pause' aria-hidden='true'></span>";
        document.getElementById('play_pause2').innerHTML = "<span class='glyphicon glyphicon-pause' aria-hidden='true'></span>";
        document.getElementById('play_pause3').innerHTML = "<span class='glyphicon glyphicon-pause' aria-hidden='true'></span>";
    } else {
        _AM.pause_scene();
        vid.pause();
        document.getElementById('play_pause1').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
        document.getElementById('play_pause2').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
        document.getElementById('play_pause3').innerHTML = "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>";
    }

}

function video_progress() {
    var vid = _AM.video_streams[0];
    $('#position').val(vid.currentTime * 100);
    document.getElementById('tposition').value = vid.currentTime;

    _AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
    show_points(_AME.cur_select.image_obj, vid.currentTime);

    if (_AME.cur_select.image_obj.triggered) {
        //the image should have now been displayed, the calculated field of img_disp_line should now be calculatable.
        /*if (_AME.cur_select.image_obj.sent) {
            $('#img_disp_lines').val(Math.round((_AME.cur_select.image_obj.sent_clip_box[3] - _AME.cur_select.image_obj.sent_clip_box[1]) / (_AME.cur_select.image_obj.sent_height)));
        } else {
            $('#img_disp_lines').val(3);//default.
        }*/
    }
}

function convert_sent_obj_to_string(sent_obj) {
    var str = "";
    if (sent_obj) {
        for (var i = 0; i < sent_obj.disp.length; i++) {
            for (var ii = 0; ii < sent_obj.disp[i].length; ii++) {
                str += sent_obj.disp[i][ii];
                if (ii == sent_obj.disp[i].length - 1 && i != sent_obj.disp.length - 1) {
                    str += "\n";
                } else if (ii != sent_obj.disp[i].length - 1) {
                    str += " ";
                }
            }
        }
    }
    return str;
}

function convert_string_to_sent_obj(str) {
    var sent = null;
    if (str && str != "") {

        var disp = [];
        lines = str.split(/\r\n|\r|\n/g);
        for (var i = 0; i < lines.length; i++) {
            disp[i] = lines[i].split(' ');
        }

        var comp = []; //strip bad grammer, if they are the same word insert null, otherwise add new word.
        for (var i = 0; i < disp.length; i++) {
            comp[i] = [];
            for (var ii = 0; ii < disp[i].length; ii++) {
                comp[i][ii] = disp[i][ii].toLowerCase().replace(/[\s\-=_!"#%&'*{},\.\/:;?\(\)\[\]@\\$\^*+<>~`\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g, '');
            }
        }

        sent = {};
        sent.disp = disp;
        sent.comp = comp;
    }

    return sent;
}

function disp_lines_change(event) {    
    _AME.cur_select.image_obj.sent_display_lines = document.getElementById('img_disp_lines').value;
    var textarea = document.getElementById('img_sentence');

    if (_AME.cur_select.image_obj.triggered) {
        //remove the image from the screen.
        if (_AME.cur_select.image_obj.image_svg_group) {
            $(_AME.cur_select.image_obj.image_svg_group).remove();
        }

        _AM.editor_add_image_to_display(_AME.cur_select.image_obj, 'svg_editor_no_animate ' + _AME.cur_select.image_obj.animate_shape_class);
    }
    
    var r = textarea.value.substr(0, textarea.selectionStart).split("\n").length - 1;
    _AM.editor_scroll_text(_AME.cur_select.image_obj.title, r);

    vid = _AM.video_streams[0];
    show_points(_AME.cur_select.image_obj, vid.currentTime);
}

function sentence_change(event) {

    var textarea = document.getElementById('img_sentence');


    _AME.cur_select.image_obj.sent = convert_string_to_sent_obj(textarea.value);
    if (_AME.cur_select.image_obj.sent != null) {
        //default the number of lines
        if (document.getElementById('img_disp_lines').value == '' || document.getElementById('img_disp_lines').value == '0') {
            _AME.cur_select.image_obj.sent_display_lines = 3; //default.
            document.getElementById('img_disp_lines').value = 3;

        } else {
            _AME.cur_select.image_obj.sent_display_lines = parseInt(document.getElementById('img_disp_lines').value);
        }

        if (!_AME.cur_select.image_obj.sent_clip_box) {
            //clip box is not defined yet.
            _AME.cur_select.image_obj.sent_clip_box = [];
            //use the first move position in shape object to be upper left corner.
            _AME.cur_select.image_obj.sent_clip_box[0] = _AME.cur_select.image_obj.animate_shape[0].num[0];
            _AME.cur_select.image_obj.sent_clip_box[1] = _AME.cur_select.image_obj.animate_shape[0].num[1];

            //these will be calculated when displayed and updated appropriately.
            _AME.cur_select.image_obj.sent_clip_box[2] = _AME.cur_select.image_obj.animate_shape[0].num[0] + 1.2 * _AM.scene_text_hor_spacing;
            _AME.cur_select.image_obj.sent_clip_box[3] = _AME.cur_select.image_obj.animate_shape[0].num[1] + 1.2 * _AM.scene_text_hor_spacing;
        }

        if (_AME.cur_select.image_obj.triggered) {

            //remove the image from the screen.
            if (_AME.cur_select.image_obj.image_svg_group) {
                $(_AME.cur_select.image_obj.image_svg_group).remove();
            }      

            _AM.editor_add_image_to_display(_AME.cur_select.image_obj, 'svg_editor_no_animate ' + _AME.cur_select.image_obj.animate_shape_class);
            //update the new clipbox

            //***TO DO:make scroll index reflect line i am on.
            var r = textarea.value.substr(0, textarea.selectionStart).split("\n").length - 1;
            _AM.editor_scroll_text(_AME.cur_select.image_obj.title, r);

            vid = _AM.video_streams[0];
            show_points(_AME.cur_select.image_obj, vid.currentTime);

            _AME.cur_select.image_obj.editor_revealed_idx = _AME.cur_select.image_obj.sent_revealed_idx;
            $('#img_revealed_idx').val(_AME.cur_select.image_obj.sent_revealed_idx);
        }
    } else {
        _AME.cur_select.image_obj.sent_clip_box = null;
    }
    //use the new width of the text to dictate the width of the clipbox.
}

function convert_path_obj_to_d(obj, from_idx) {
    if (!from_idx) {
        from_idx = 0;
    }
    var res = "";
    var max = Math.max(obj.num.length, obj.com.length);
    for (var i = from_idx; i < max; i++) {
        if (obj.com[i] && obj.com[i] != "Z") {
            res += obj.com[i];
        }
        if (obj.com[i] && obj.com[i] == "Z") {
            res += " ";
        }
        if (obj.num[i] || obj.num[i] == 0) {
            res += obj.num[i];
        }
        if (obj.com[i] && obj.com[i] == "Z") {
            res += obj.com[i];
        }
    }

    /*if (obj.num.length != obj.com.length) {
        //assuming there are more commands than numbers.
        //add the last Z command.
        res += obj.com[obj.com.length - 1];
    }*/

    return res;
}

function mouse_move(event) {
    var svg = document.getElementById('story_svg');
    var pt;
    var newpt;

    if (pan_mouse_is_down) {
        pt = {};

        pt.x = event.clientX;
        pt.y = event.clientY;

        var disp_x = last_pan_position.x - pt.x;
        var disp_y = last_pan_position.y - pt.y;

        var sc = $(_AM.video_streams[0]).width() / video_int_width;

        //transform viewbox.
        //var x1 = ((parseInt(last_viewBox[0]) + disp_x / sc)).toFixed(0);
        //var y1 = ((parseInt(last_viewBox[1]) + disp_y / sc)).toFixed(0);

        var x1 = Math.floor(parseInt(last_viewBox[0]) + disp_x / sc);
        var y1 = Math.floor(parseInt(last_viewBox[1]) + disp_y / sc);


        //update viewbox on screen.
        document.getElementById('story_svg').setAttributeNS(null, 'viewBox', x1.toFixed(0) + ' ' + y1.toFixed(0) + ' ' + video_int_width.toFixed(0) + ' ' + video_int_height.toFixed(0));
        //$(_AM.video_streams[0]).attr("style", "margin-top:" + (-y1*sc).toFixed(0) + "px; margin-left:" + (-x1*sc).toFixed() + "px;");
        //$(_AM.video_streams[1]).attr("style", "margin-top:" + (-y1*sc).toFixed(0) + "px; margin-left:" + (-x1*sc).toFixed() + "px;");

        //last_pan_margin.left = _AM.video_stream[0].style.marginLeft;
        //last_pan_margin.top

        //$(_AM.video_streams[0]).attr("style", "margin-top:" + (last_pan_margin.left - disp_y).toFixed(0) + "px; margin-left:" + (last_pan_margin.top - disp_x).toFixed() + "px;");
        //$(_AM.video_streams[1]).attr("style", "margin-top:" + (last_pan_margin.left - disp_y).toFixed(0) + "px; margin-left:" + (last_pan_margin.top - disp_x).toFixed() + "px;");
        _AM.video_streams[0].style.marginTop = (last_pan_margin.top - disp_y).toFixed(0) + "px";
        _AM.video_streams[0].style.marginLeft = (last_pan_margin.left - disp_x).toFixed(0) + "px";
        _AM.video_streams[1].style.marginTop = (last_pan_margin.top - disp_y).toFixed(0) + "px";
        _AM.video_streams[1].style.marginLeft = (last_pan_margin.left - disp_x).toFixed(0) + "px";

    } else if (pencil_mouse_is_down) {
        //check for drag...
        //svg = document.getElementById('story_svg');
        pt = svg.createSVGPoint();

        pt.x = event.clientX;
        pt.y = event.clientY;

        newpt = pt.matrixTransform(svg.getScreenCTM().inverse());

        if ((Math.abs(newpt.x - last_pencil_position.x) > 3 || Math.abs(newpt.y - last_pencil_position.y) > 3) && !pencil_mouse_is_dragging) {
            //dragging... convert curve command.

            pencil_mouse_is_dragging = true;
            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));

            delete_node(_AME.cur_select.shape_obj, point_idx);
            add_node("C");
            point_idx += 4;

            //drop the point, here... this needs to be updated... the previous L command needs to be removed...                    
            _AME.cur_select.point_obj = last_pencil_position;

            if (last_point_snapped) {
                //need to preserve last node.
                last_point_snapped = false;
                _AME.cur_select.shape_obj.com[point_idx + 1] = "Z";
            }
            //_AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            //_AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;
            //var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));

            //var close_to_x;

            //check for proximity to snap to.
            /*for (var i = 0; i < _AME.cur_select.shape_obj.num.length; i++) {
                if (i != point_idx) {
                    if (!(i % 2)) {
                        //x
                        close_to_x = false;
                        if (Math.abs(last_pencil_position.x - _AME.cur_select.shape_obj.num[i]) < snap_range) {
                            close_to_x = true;
                        }

                    } else {
                        //y
                        //close_to_y = false;
                        if (close_to_x && Math.abs(last_pencil_position.y - _AME.cur_select.shape_obj.num[i]) < snap_range) {
                            //snap it then.
                            //close_to_y = true;

                            //now detect if it is a point that could be closed with Z as opposed to snapping the point???

                            //snap the point.
                            last_pencil_position.x = _AME.cur_select.shape_obj.num[i - 1];
                            last_pencil_position.y = _AME.cur_select.shape_obj.num[i];

                            //add_node_type = "";
                            break;
                        }
                        close_to_x = false;
                    }
                }
            }*/

            _AME.cur_select.circle_obj.cx.baseVal.value = last_pencil_position.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = last_pencil_position.y;

            _AME.cur_select.shape_obj.num[point_idx] = last_pencil_position.x;
            _AME.cur_select.shape_obj.num[point_idx + 1] = last_pencil_position.y;

            //update the last control point to be equal too.
            _AME.cur_select.shape_obj.num[point_idx - 2] = last_pencil_position.x;
            _AME.cur_select.shape_obj.num[point_idx - 1] = last_pencil_position.y;

            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));

            if (_AME.cur_select.image_obj.image_svg_img) {
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'x', _AME.cur_select.shape_obj.num[0]);
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'y', _AME.cur_select.shape_obj.num[1]);
            }

            //end paste
            mouse_grab_type = "curve_ctrl_point";
            //change what the ctrl point is.

            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
            point_idx += -2;

            _AME.cur_select.circle_obj = document.getElementById('select_points_' + point_idx);
            is_mouse_down = true;
        }
    }

    if (is_mouse_down || is_add_new_node) {
        if (mouse_grab_type == "point" && !(last_point_snapped && pencil_mouse_is_down)) {
            //svg = document.getElementById('story_svg');
            pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            _AME.cur_select.point_obj = newpt;

            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));

            _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

            _AME.cur_select.shape_obj.num[point_idx] = newpt.x;
            _AME.cur_select.shape_obj.num[point_idx + 1] = newpt.y;

            _AME.cur_select.shape_obj.num[point_idx] = newpt.x;
            _AME.cur_select.shape_obj.num[point_idx + 1] = newpt.y;

            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));

            if (_AME.cur_select.image_obj.image_svg_img) {
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'x', _AME.cur_select.shape_obj.num[0]);
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'y', _AME.cur_select.shape_obj.num[1]);
            }
        } else if (mouse_grab_type == "curve_to_point") {
            //the following is commented out because i dont think this ever occurs anymore.
            /*
            svg = document.getElementById('story_svg');
            var pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            var newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            _AME.cur_select.point_obj = newpt;

            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));

            _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

            _AME.cur_select.shape_obj.num[point_idx] = newpt.x;
            _AME.cur_select.shape_obj.num[point_idx + 1] = newpt.y;

            //update the last control point to be equal too.
            _AME.cur_select.shape_obj.num[point_idx - 2] = newpt.x;
            _AME.cur_select.shape_obj.num[point_idx - 1] = newpt.y;

            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));

            if (_AME.cur_select.image_obj.image_svg_img) {
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'x', _AME.cur_select.shape_obj.num[0]);
                _AME.cur_select.image_obj.image_svg_img.setAttributeNS(null, 'y', _AME.cur_select.shape_obj.num[1]);
            }
            */

        } else if (mouse_grab_type == "curve_ctrl_point") {
            //svg = document.getElementById('story_svg');
            pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            var newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            _AME.cur_select.point_obj = newpt;

            _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));

            _AME.cur_select.shape_obj.num[point_idx] = newpt.x;
            _AME.cur_select.shape_obj.num[point_idx + 1] = newpt.y;

            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));


        } else if (mouse_grab_type == "path") {
            pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            _AME.cur_select.point_obj = newpt;

            _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

            var disp_x = Math.floor(newpt.x - last_path_position.x);
            var disp_y = Math.floor(newpt.y - last_path_position.y);

            //go through and update all text object positions.                   
            for (var i = 0; i < _AME.cur_select.shape_obj.num.length; i++) {
                if (!(i % 2)) {
                    //x
                    _AME.cur_select.shape_obj.num[i] = last_path.num[i] + disp_x;
                } else {
                    //y
                    _AME.cur_select.shape_obj.num[i] = last_path.num[i] + disp_y;
                }
            }

            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
            update_animate_image(1);

            //show_points(_AME.cur_select.shape_obj, _AME.cur_select.shape_obj.time);
        } else if (mouse_grab_type == "clipbox") {
            //svg = document.getElementById('story_svg');
            pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            _AME.cur_select.point_obj = newpt;

            _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
            _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

            //go through and update all text object positions.                   
            new_clip_box = [];
            new_clip_box[0] = Math.floor(newpt.x - (_AME.cur_select.image_obj.sent_clip_box[2] - _AME.cur_select.image_obj.sent_clip_box[0]) / 2.0);
            new_clip_box[1] = Math.floor(newpt.y - (_AME.cur_select.image_obj.sent_clip_box[3] - _AME.cur_select.image_obj.sent_clip_box[1]) / 2.0);
            new_clip_box[2] = new_clip_box[0] + (_AME.cur_select.image_obj.sent_clip_box[2] - _AME.cur_select.image_obj.sent_clip_box[0]);
            new_clip_box[3] = new_clip_box[1] + (_AME.cur_select.image_obj.sent_clip_box[3] - _AME.cur_select.image_obj.sent_clip_box[1]);

            var clip_rect_box = document.getElementById('svg_clip_box_rect');
            clip_rect_box.setAttributeNS(null, 'x', new_clip_box[0]);
            clip_rect_box.setAttributeNS(null, 'y', new_clip_box[1]);
            clip_rect_box.setAttributeNS(null, 'width', new_clip_box[2] - new_clip_box[0]);
            clip_rect_box.setAttributeNS(null, 'height', new_clip_box[3] - new_clip_box[1]);

            var clip_rect = document.getElementById('svg_image_clip_rect_' + _AME.cur_select.image_obj.title);
            clip_rect.setAttributeNS(null, 'x', new_clip_box[0]);
            clip_rect.setAttributeNS(null, 'y', new_clip_box[1]);


            var dx = _AM.scene_text_hor_spacing;
            var dy = _AM.scene_text_ver_spacing;
            var h = _AM.scene_text_ver_spacing * 2 + _AM.video_intrinsic_font_size;
            var cur_y;
            var cur_x;

            _AME.cur_select.image_obj.sent_text_tale_height = 0;
            var word_count = 0;
            //for each line of text.            
            var r = 0;
            for (r = 0; r < _AME.cur_select.image_obj.sent.disp.length; r++) {
                cur_x = new_clip_box[0]; // animate_shape[0].num[0];
                cur_y = new_clip_box[1] + ((r * 2) + 1) * dy + (r + 1) * h - _AME.cur_select.image_obj.sent_text_tale_height;

                var svg_text = document.getElementById('svg_image_text_' + _AME.cur_select.image_obj.title + '_' + r);

                svg_text.setAttributeNS(null, 'x', cur_x);
                svg_text.setAttributeNS(null, 'y', cur_y);

                //for each word in the line of text.                
                for (var w = 0; w < _AME.cur_select.image_obj.sent.disp[r].length; w++) {

                    //should now be able to get bounding box.
                    if (r == 0 && w == 0) {
                        var bb = svg_text.getBBox();
                        h = Math.ceil(bb.height);
                        _AME.cur_select.image_obj.sent_height = h;
                        _AME.cur_select.image_obj.sent_text_tale_height = Math.ceil((bb.y + bb.height) - cur_y);
                        //image.sent_top = Math.floor(bb.y);
                        //height was calculated incorrectly first time through.
                        cur_y = new_clip_box[1] + ((r * 2) + 1) * dy + (r + 1) * h - _AME.cur_select.image_obj.sent_text_tale_height;
                        svg_text.setAttributeNS(null, 'y', cur_y);
                    }
                    var svg_text_span = document.getElementById('svg_image_text_span_' + _AME.cur_select.image_obj.title + '_' + word_count);
                    var wth = svg_text_span.getComputedTextLength() + 2 * dx;

                    //now build rectangles.
                    var svg_rect = document.getElementById('svg_image_text_rect_' + _AME.cur_select.image_obj.title + '_' + word_count);

                    svg_rect.setAttributeNS(null, 'x', cur_x + dx);
                    svg_rect.setAttributeNS(null, 'y', cur_y + _AME.cur_select.image_obj.sent_text_tale_height - h - dy);
                    //svg_rect.setAttributeNS(null, 'width', wth);
                    svg_rect.setAttributeNS(null, 'height', h + dy);

                    //if (word_count != _AME.cur_select.image_obj.sent_revealed_idx) {
                    //    svg_rect.setAttributeNS(null, 'class', _AME.cur_select.image_obj.animate_shape_class + '_text_box_hide');
                    //} else {
                    //    svg_rect.setAttributeNS(null, 'class', _AME.cur_select.image_obj.animate_shape_class + '_text_box_show');
                    //}

                    //parentElement.insertBefore(newElement, parentElement.children[0]);
                    //svg_parent.insertBefore(svg_rect, svg_text);
                    //text_group.insertBefore(svg_rect, svg_text);

                    cur_x += wth;
                    word_count++;
                }
            }
            //end update all text object positions

            var image_svg_speaker = document.getElementById('svg_image_text_speaker_' + _AME.cur_select.image_obj.title);
            if (image_svg_speaker) {
                image_svg_speaker.setAttributeNS(null, 'x', new_clip_box[2] - h * 1.2);
                image_svg_speaker.setAttributeNS(null, 'y', new_clip_box[1]);
            }

            var image_svg_select = document.getElementById('svg_image_text_select_' + _AME.cur_select.image_obj.title);
            if (image_svg_select) {
                image_svg_select.setAttributeNS(null, 'x', new_clip_box[2] - h);


                if (r < _AME.cur_select.image_obj.sent_display_lines) {
                    cur_y = new_clip_box[1] + (((_AME.cur_select.image_obj.sent_display_lines - 1) * 2) + 1) * dy + ((_AME.cur_select.image_obj.sent_display_lines - 1) + 1) * h - _AME.cur_select.image_obj.sent_text_tale_height;
                }

                image_svg_select.setAttributeNS(null, 'y', cur_y - h); //-h+(h-_AM.video_intrinsic_font_size)
            }

            var image_svg_scroll_up = document.getElementById('svg_image_text_scrollup_' + _AME.cur_select.image_obj.title);
            if (image_svg_scroll_up) {
                image_svg_scroll_up.setAttributeNS(null, 'x', new_clip_box[0] - h);
                image_svg_scroll_up.setAttributeNS(null, 'y', new_clip_box[1]);
            }

            var image_svg_scroll_down = document.getElementById('svg_image_text_scrolldown_' + _AME.cur_select.image_obj.title);
            if (image_svg_scroll_down) {
                image_svg_scroll_down.setAttributeNS(null, 'x', new_clip_box[0] - h);
                image_svg_scroll_down.setAttributeNS(null, 'y', new_clip_box[3] - h); //-h+(h-_AM.video_intrinsic_font_size)
            }

            //Note the clipbox, is not animatable.
            _AME.cur_select.image_obj.sent_clip_box = new_clip_box;
            
        } else if (mouse_grab_type == "scale") {
            
            pt = svg.createSVGPoint();

            pt.x = event.clientX;
            pt.y = event.clientY;

            newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
            //_AME.cur_select.point_obj = newpt;            

            //calculate scale in x direction and y direction.
            var scale_x = 1.0;
            var scale_y = 1.0;

            if ((_AME.cur_select.square_obj_me.x.baseVal.value - _AME.cur_select.square_obj_opp.x.baseVal.value != 0)) {
                scale_x = (newpt.x - (box_size / 2.0) - _AME.cur_select.square_obj_opp.x.baseVal.value) / (_AME.cur_select.square_obj_me.x.baseVal.value - _AME.cur_select.square_obj_opp.x.baseVal.value);
            }

            if ((_AME.cur_select.square_obj_me.y.baseVal.value - _AME.cur_select.square_obj_opp.y.baseVal.value) != 0) {
                scale_y = (newpt.y - (box_size / 2.0) - _AME.cur_select.square_obj_opp.y.baseVal.value) / (_AME.cur_select.square_obj_me.y.baseVal.value - _AME.cur_select.square_obj_opp.y.baseVal.value);
            }

            svg_scale_helper(_AME.cur_select.square_obj_opp.x.baseVal.value + (box_size / 2.0), _AME.cur_select.square_obj_opp.y.baseVal.value + (box_size / 2.0), scale_x, scale_y);

        } else if (mouse_grab_type == "rotate") {
            svg = document.getElementById('story_svg');
            var pt = svg.createSVGPoint();
            pt.x = event.clientX;
            pt.y = event.clientY;

            var new_rotate_position = pt.matrixTransform(svg.getScreenCTM().inverse());
            //last_center = get_path_center(_AME.cur_select.shape_obj);

            new_rotate_position.x -= last_center.x
            new_rotate_position.y -= last_center.y

            new_angle = Math.atan2(new_rotate_position.y, new_rotate_position.x);

            var theta = new_angle - last_angle;

            //need to change this so it doesnt have to be such a long range.


            svg_rotate_helper(last_center, theta);
        }

    }
}

function mouse_grab_rotate_box(evt, me) {
    //makes copy of current svg object.
    //if (_AME.cur_select.shape_obj) {
        if (last_angle && _AME.cur_select.square_obj_me && _AME.cur_select.square_obj_me != me) {
            //switched which was grabed, need to update last_angle.
            last_angle += parseFloat(me.getAttributeNS(null, 'data-rad')) - parseFloat(_AME.cur_select.square_obj_me.getAttributeNS(null, 'data-rad'));
        }

        _AME.cur_select.square_obj_me = me;
        svg = document.getElementById('story_svg');
        var pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;

        last_rotate_position = pt.matrixTransform(svg.getScreenCTM().inverse());
        /*last_center = {};
        var bbox = get_path_box(_AME.cur_select.shape_obj);
        last_center.x = bbox.x + bbox.width / 2.0;
        last_center.y = bbox.y + bbox.height / 2.0;
        last_rad = Math.sqrt((bbox.width / 2.0) * (bbox.width / 2.0) + (bbox.height / 2.0) * (bbox.height / 2.0));*/


        last_rotate_position.x -= last_center.x
        last_rotate_position.y -= last_center.y

        if (!last_angle) {
            last_angle = Math.atan2(last_rotate_position.y, last_rotate_position.x);
            last_svg_path_obj = JSON.parse(JSON.stringify(_AME.cur_select.shape_obj));
        }

        is_mouse_down = true;
        mouse_grab_type = "rotate"
    //}
}

function mouse_grab_scale_box(me, opp) {
    _AME.cur_select.square_obj_me = me;
    _AME.cur_select.square_obj_opp = opp;
    is_mouse_down = true;
    mouse_grab_type = "scale";

    last_svg_path_obj = JSON.parse(JSON.stringify(_AME.cur_select.shape_obj));
}

function mouse_grab_clip_box(event) {
    _AME.cur_select.circle_obj = this;
    is_mouse_down = true;
    mouse_grab_type = "clipbox";
}


function mouse_grab_path(event) {
    _AME.cur_select.circle_obj = this;
    is_mouse_down = true;
    mouse_grab_type = "path";

    //store the start position of the path object.
    svg = document.getElementById('story_svg');
    var pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    last_path_position = pt.matrixTransform(svg.getScreenCTM().inverse());

    last_path = JSON.parse(JSON.stringify(_AME.cur_select.shape_obj));
    remove_points_for_move();
}

function mouse_grab_point(event) {
    //_AME.cur_select.point_obj = _AME.cur_select.shape_obj[parseInt(this.getAttributeNS(null, 'data-idx'))];

    if (mouse_grab_type != "curve_to_point") {
        _AME.cur_select.circle_obj = this;
        is_mouse_down = true;
        mouse_grab_type = "point";
    }
}

function mouse_grab_ctrl_point(event) {
    //_AME.cur_select.point_obj = _AME.cur_select.shape_obj[parseInt(this.getAttributeNS(null, 'data-idx'))];
    //_AME.cur_select.circle_obj = this;
    //is_mouse_down = true;
    //mouse_grab_type = "point";
}

//waiting to detect drag.
function mouse_down(event) {
    if (svg_pencil_active && !pencil_mouse_is_down) {
        /*svg = document.getElementById('story_svg');
        var pt = svg.createSVGPoint();

        pt.x = event.clientX;
        pt.y = event.clientY;

        last_pencil_position = pt.matrixTransform(svg.getScreenCTM().inverse());
        */

        //snap point

        //check proximity to snap point to an existing point.
        svg = document.getElementById('story_svg');
        var pt = svg.createSVGPoint();

        pt.x = event.clientX;
        pt.y = event.clientY;

        var newpt = pt.matrixTransform(svg.getScreenCTM().inverse());
        _AME.cur_select.point_obj = newpt;

        var close_to_y = false;
        var m_count = 0;
        //var close_to_y;    
        var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
        //check for proximity to snap to.
        //only -1 because we want to start at the y position.
        last_point_snapped = false;
        for (var i = point_idx - 1; i > 0; i--) {
            if (i != point_idx) {
                if ((i % 2)) {
                    //x
                    close_to_y = false;
                    if (Math.abs(newpt.y - _AME.cur_select.shape_obj.num[i]) < snap_range) {
                        close_to_y = true;
                    }
                } else {
                    if (_AME.cur_select.shape_obj.com[i] == " M") {
                        m_count++;
                    }
                    //y
                    //close_to_y = false;
                    if (close_to_y && Math.abs(newpt.x - _AME.cur_select.shape_obj.num[i]) < snap_range) {
                        //snap it then.
                        //close_to_y = true;
                        last_point_snapped = true;
                        //now detect if it is a point that could be closed with Z as opposed to snapping the point???
                        if (_AME.cur_select.shape_obj.com[i] == " M" && m_count == 1 && i != 0) {
                            //then we can close path.

                            _AME.cur_select.shape_obj.com[point_idx + 1] = "Z";
                        }

                        //snap the point.
                        newpt.x = _AME.cur_select.shape_obj.num[i];
                        newpt.y = _AME.cur_select.shape_obj.num[i + 1];

                        //only want to clear this, if snap to is closing a path... this would be position 1, if the path was only the stroked path
                        //but the first M command is the position of the image.
                        if (i != 0 && _AME.cur_select.shape_obj.com[i] == " M") {
                            //add_node_type = "";
                            //deactive pencil
                            //svg_controls_off();
                        }
                        break;
                    }
                    close_to_y = false;
                }
            }


        }

        _AME.cur_select.circle_obj.cx.baseVal.value = newpt.x;
        _AME.cur_select.circle_obj.cy.baseVal.value = newpt.y;

        _AME.cur_select.shape_obj.num[point_idx] = newpt.x;
        _AME.cur_select.shape_obj.num[point_idx + 1] = newpt.y;

        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        var vid = _AM.video_streams[0];
        show_points(_AME.cur_select.image_obj, vid.currentTime);

        last_pencil_position = newpt;
        //end snap point
        pencil_mouse_is_down = true;
    } else if (svg_pan_active && !pan_mouse_is_down) {
        svg = document.getElementById('story_svg');
        last_viewBox = svg.getAttributeNS(null, "viewBox").split(" ");
        last_pan_margin = {};
        last_pan_margin.left = parseInt(_AM.video_streams[0].style.marginLeft.replace("px;", ""));
        last_pan_margin.top = parseInt(_AM.video_streams[0].style.marginTop.replace("px;", ""));

        if (isNaN(last_pan_margin.left)) {
            last_pan_margin.left = 0;
        }

        if (isNaN(last_pan_margin.top)) {
            last_pan_margin.top = 0;
        }



        var pt = {};

        pt.x = event.clientX;
        pt.y = event.clientY;

        last_pan_position = pt;//.matrixTransform(svg.getScreenCTM().inverse());
        pan_mouse_is_down = true;
    }
}

function mouse_pan_up(event) {
    pan_mouse_is_down = false;

}

function mouse_tran_up(event) {
    if (svg_rotate_active) {
        mouse_grab_type = "";
    }

    if (svg_scale_active) {
        _AME.cur_select.square_obj_me = null;
        _AME.cur_select.square_obj_opp = null;
        mouse_grab_type = "";
    }
}

function mouse_up(event) {
    pencil_mouse_is_dragging = false;
    pencil_mouse_is_down = false;

    if (mouse_grab_type == "path") {
        var vid = _AM.video_streams[0];
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    }

    /*if (svg_pan_active) {
        svg_pan_active = false;
        $('#svg_pan').removeClass("active");
    }*/

    is_mouse_down = false;   

    if (is_add_new_node) {
        is_add_new_node = false;
        //am i going to automatically add another command?
        switch (add_node_type) {
            case "Z":
                add_node_type = "";
                break;

            case "M":
                add_node_type = "L";
                break;

            case "L":
                break;

            case "C":
                add_node_type = "L";
                break;
        }

        /*if (mouse_grab_type == "curve_to_point") {
            mouse_grab_type = "curve_ctrl_point";
            //change what the ctrl point is.

            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
            point_idx += -2;

            _AME.cur_select.circle_obj = document.getElementById('select_points_' + point_idx);
            is_mouse_down = true;

        }else if(mouse_grab_type == "curve_ctrl_point")
        {
            mouse_grab_type = "curve_to_point";
        }*/

        if (add_node_type != "") {
            add_node(add_node_type);
        }
    }
}

function convert_to_array(images) {
    var array_images = [];
    var i = 0;
    for (var key in images) {
        if (images.hasOwnProperty(key)) {          
            array_images[i] = images[key];
            i++;
        }
    }

    return array_images;
}

function save_scene(s) {
    //maybe add session number here etc.
    console.log(_ajax_url_save_scene_mongo);
    s.array_images = convert_to_array(s.images);

    show_working();
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: _ajax_url_save_scene + "/" + c1 + "/" + session_id + "/",
        data: JSON.stringify(s),
        scene_obj: s,
        success: function (data) {
            //alert(data);                   
            //find last ~ in data this is the scene name, use it in the get_objects search.
            var items = data.split('~');
            var new_title = items[items.length - 1].split(':');
            $('#obj_search').val(new_title[1]);
            //check if the scene.title guid exists in the all_objects object, if not add it, and redisplay.
            _AME.get_objects($('#obj_search').val(), true, document.getElementById('object_results'), 'all_objects', _AME.cur_select, _AME.explorer_click_scene, _AME.explorer_click_image, true);

            if (is_scene_selected) {
                //_AME.explorer_click_scene(_explorer_click_event);
            }else if (is_image_selected) {
                //_AME.explorer_click_image(_explorer_click_event);
            }            
        },
        error: function (error) {
            jsonValue = JSON.parse(error.responseText);
            //jError('An error has occurred while saving the new part source: ' + jsonValue, { TimeShown: 3000 });
        }
    });

    console.log(_ajax_url_save_scene_mongo);
    s._id = s.uidGroup;
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: _ajax_url_save_scene_mongo,
        data: JSON.stringify(s),
        scene_obj: s,
        success: function (data) {
            //delete this.scene_obj._id;
        },
        error: function (error) {
            jsonValue = JSON.parse(error.responseText);
            //jError('An error has occurred while saving the new part source: ' + jsonValue, { TimeShown: 3000 });
        }
    });
}

_AME.set_first_scene = function set_first_scene(s) {
    //maybe add session number here etc.
    //s.array_images = convert_to_array(s.images);
    $.get(_ajax_url_set_first_scene + "/" + c1 + "/" + session_id + "/" + s.uidGroup,
    function (data) {
        //result of operation.
        //get_objects($('#obj_search').val(), true, document.getElementById('object_results'), 'all_objects', _AME.cur_select, _AME.explorer_click_scene, _AME.explorer_click_image);
        if (data != 'true') {
            alert(data);
        }
    });
}

function save_global_prop() {
    //maybe add session number here etc.
    //s.array_images = convert_to_array(s.images);
    var s = {};

    var movie_size = $('#story_movie_size').val().split('x');

    s.video_int_width = parseInt(movie_size[0]);
    s.video_int_height = parseInt(movie_size[1]);


    s.video_int_font_size = $('#story_font_size').val();

    show_working();
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: _ajax_url_save_globalvars + "/" + c1 + "/" + session_id + "/",
        data: JSON.stringify(s),
        scene_obj: s,
        success: function (data) {
            //alert(data);                   
            if (data != 'true') {
                hide_working();
                alert(data);
            } else {
                //TO DO: success, reload editor.
                //save the css file.
                var data = new FormData();
                var files = $("#css_file").get(0).files;

                // Add the uploaded image content to the form data collection
                if (files.length > 0) {
                    data.append("css_file", files[0]);

                    // Make Ajax request with the contentType = false, and procesDate = false
                    //show_working();
                    var ajaxRequest = $.ajax({
                        type: "POST",
                        url: _ajax_url_upload_css + "/" + c1 + "/" + session_id + "/",
                        contentType: false,
                        processData: false,
                        data: data,
                        success: function (data) {
                            hide_working();
                            //window.location.href = "";
                            //window.location.href = "editor.html";
                            window.location.reload(true);
                        }
                    });
                } else {
                    hide_working();
                    window.location.reload(true);
                    //window.location.href = "";
                    //window.location.href = "editor.html";
                }
            }
            //check if the scene.title guid exists in the all_objects object, if not add it, and redisplay.

        },
        error: function (error) {
            jsonValue = JSON.parse(error.responseText);
            //jError('An error has occurred while saving the new part source: ' + jsonValue, { TimeShown: 3000 });
        }
    });
}

_AME.save_selected_scene = function save_selected_scene() {
    if (is_global_prop) {
        //TODO: save global properties.
        save_global_prop();
    } else {
        if (svg_pencil_active) {
            svg_pencil_active = false;
            var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
            $(_AME.cur_select.circle_obj).remove();
            delete_node(_AME.cur_select.shape_obj, point_idx);
            //update screen.
            var vid = _AM.video_streams[0];
            _AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
            show_points(_AME.cur_select.image_obj, vid.currentTime);


        }
        save_scene(_AME.cur_select.scene_obj);
    }
}


_AME.add_scene_or_image = function add_scene_or_image() {
    //set up the scene object.
    if (is_image_selected == false && is_scene_selected == false) {
        //add new scene.
        var s = new _AM.Scene($('#obj_search').val(), 5, 20, 15, 5, "count_leader.mp4", [], null, 1, 1);
        s.name = $('#obj_search').val();
        s.video_src = "count_leader.mp4";
        s.end_scene = 0;
        delete s.add_iframe;
        delete s.add_sentence;
        save_scene(s);
    } else {
        //add a new image instead.
        //image names must be unique... currently no check.
        //this should add to the current selected scenes images too... as they both should be pointing to the same images list currently.
        //Scene_Image(title, scene_title, start_time, end_time, image_src, width, height, animate_shape, sentence, sent_line_disp, sentence_clip_box, animate_shape_class, flash, image_group, next_image_group, hide_image_groups, can_select, revealed_idx, is_scramble, karma, needed, loop_animate)
        // [{ time: 0, num: [], com: []}], { disp: [["you", "are", "surrounded", "by"], ["wild", "animals"]], comp: [[, , , ], [, ]] }, [80, 13, 387, 105], 'story_svg', false, "wild", null, false, 30, false, 0, null, 0));
        var i = new _AM.Scene_Image($('#obj_search').val(), _AME.cur_select.scene_obj.title, 5, _AME.cur_select.scene_obj.end_time, "", 0, 0, [{ time: 0, num: [0, 0], com: [" M", " "] }], "", null, null, null, "story_svg", false, null, null, null, 1, 0);
        i.fkuidGroup_t_catalog_scene = _AME.cur_select.scene_obj.uidGroup;
        _AM.add_image(i);

        save_scene(_AME.cur_select.scene_obj);
    }
}

_AME.delete_scene_or_image = function delete_scene_or_image() {
    //set up the scene object.
    if (is_scene_selected == true) {
        //delete scene.       
        if (confirm('Are you sure you want to delete this scene?')) {
            show_working();
            $.get(_ajax_url_delete_scene + "/" + catalog_id + "/" + session_id + "/" + _AME.cur_select.scene_obj.uidGroup,
                function (data) {
                    //result of operation.                    
                    _AME.get_objects($('#obj_search').val(), true, document.getElementById('object_results'), 'all_objects', _AME.cur_select, _AME.explorer_click_scene, _AME.explorer_click_image, true);
                });
        }
    } else if (is_image_selected == true) {
        //delete image.        
        if (confirm('Are you sure you want to delete this image?')) {
            show_working();
            $.get(_ajax_url_delete_image + "/" + catalog_id + "/" + session_id + "/" + _AME.cur_select.image_obj.uidGroup,
                function (data) {
                    //result of operation.

                    //save scene is needed here to rebuild the function that is served.
                    //save_scene(_AME.cur_select.scene_obj);
                    _AME.get_objects($('#obj_search').val(), true, document.getElementById('object_results'), 'all_objects', _AME.cur_select, _AME.explorer_click_scene, _AME.explorer_click_image, true);
                });
        }
    }
}

function reset_image_group_display() {
    if (_AME.cur_select.image_obj != null) {
        _AM.reset_AM();
        _AM.editor_init();
        _AM.init_save_data(_story_name + '_editor');

        $('#story_svg').on('mousemove', mouse_move);
        $('#story_svg').on('mousedown', mouse_down);
        //mouseup is not here because its on the circle objects...  
        $('#story_svg').on('mouseup', mouse_tran_up);
        $('#story_svg').on('mouseup', mouse_pan_up);

        $(_AM.video_streams[0]).on('timeupdate', function () { video_progress(); });
        $(_AM.video_streams[0]).on('ended', function () { clear_play_setting(); });

        _AM.scenes = [];
        _AM.scenes[0] = {};
        _AM.scenes[0][_AME.cur_select.scene_obj.title] = _AME.cur_select.scene_obj;
        _AM.set_current_scene(_AM.scenes[0][_AME.cur_select.scene_obj.title]);
        _AM.images = _AME.cur_select.scene_obj.images;

        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                _AM.images[key].triggered = false;
                _AM.images[key].is_displayed = false;
            }
        }

        config_image_scene(_AME.cur_select);

        $(_AM.video_streams[0]).on('canplay', function (event) {
            if (_AME.cur_select.image_obj.start_time > 0 && _AME.cur_select.image_obj.animate_shape[0].time + _AME.cur_select.image_obj.start_time < _AM.video_streams[0].duration) {
                _AM.video_streams[0].currentTime = _AME.cur_select.image_obj.animate_shape[0].time + _AME.cur_select.image_obj.start_time;
            } else {
                _AM.video_streams[0].currentTime = _AME.cur_select.image_obj.animate_shape[0].time;
            }
            get_time_frames(_AME.cur_select.image_obj.animate_shape, document.getElementById('time_select'), _AME.click_time_frame, _AME.cur_select, true);
            _AME.cur_select.shape_obj = null;
            set_selected_shape(_AME.cur_select.image_obj.animate_shape[0], document.getElementById('time_select_0'), _AME.cur_select);
            update_animate_image(1);
            $(this).off(event);
        });

        /*$(_AM.video_streams[1]).on('canplay', function (event) {

            if (_AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene) {
                if (_AME.cur_select.image_obj.next_scene_goto) {
                    
                }
            }
            $(this).off(event);
        });*/
    }
}

function image_group_typed() {
    for (var key in _AME.cur_select.scene_obj.images) {
        if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
            if (_AME.cur_select.scene_obj.images[key].uidGroup != _AME.cur_select.image_obj.uidGroup &&
                _AME.cur_select.scene_obj.images[key].image_group == _AME.cur_select.image_obj.image_group) {
                //found match for group, take the value of start and finish.
                _AME.cur_select.image_obj.start_time = _AME.cur_select.scene_obj.images[key].start_time;
                _AME.cur_select.image_obj.end_time = _AME.cur_select.scene_obj.images[key].end_time;

                $('#img_start_time').val(_AME.cur_select.image_obj.start_time);
                $('#img_end_time').val(_AME.cur_select.image_obj.end_time);
                break;
            }
        }
    }

    reset_image_group_display();
}

//update video source time.

function video_src_change() {
    config_video_scene(_AME.cur_select);
}

function css_change() {
    reset_image_group_display();    
}

_AME.save_story_settings = function save_story_settings() {
    //store.set(_AM.session_id, _story_name_settings, JSON.stringify(window._story_settings));
}

function wireup() {
    //$('#scene_name').val(_AME.cur_select.scene_obj.name);
    $('#scene_name').on('keyup paste', function () { _AME.cur_select.scene_obj.name = document.getElementById('scene_name').value; });

    $('#scene_start_time').on('keyup paste', function () {
        _AME.cur_select.scene_obj.start_time = parseFloat(document.getElementById('scene_start_time').value);
        $('#position').val(Math.floor(_AME.cur_select.scene_obj.start_time * 100.00));
        //video_pos_playback_change();
    });

    //$('#scene_end_time').val(_AME.cur_select.scene_obj.end_time);
    $('#scene_end_time').on('keyup paste', function () {
        _AME.cur_select.scene_obj.end_time = parseFloat(document.getElementById('scene_end_time').value);
        $('#position').val(Math.floor(_AME.cur_select.scene_obj.end_time * 100.00));
        //video_pos_playback_change();
    });

    //$('#scene_loop_until').val(_AME.cur_select.scene_obj.loop_until);
    $('#scene_loop_until').on('keyup paste', function () {
        _AME.cur_select.scene_obj.loop_until = parseFloat(document.getElementById('scene_loop_until').value);
        $('#range_from').val(Math.floor(_AME.cur_select.scene_obj.loop_until * 100.00));
        //video_pos_change();
    });

    //$('#scene_loop_goto').val(_AME.cur_select.scene_obj.loop_goto);
    $('#scene_loop_goto').on('keyup paste', function () {
        _AME.cur_select.scene_obj.loop_goto = parseFloat(document.getElementById('scene_loop_goto').value);
        $('#range_to').val(Math.floor(_AME.cur_select.scene_obj.loop_goto * 100.00));
        //video2_pos_change();
    });

    //$('#scene_video_src').val(_AME.cur_select.scene_obj.video_src);
    $('#scene_video_src').on('keyup paste', function () {
        _AME.cur_select.scene_obj.video_src = document.getElementById('scene_video_src').value;
        clearTimeout(video_src_change_handle);
        video_src_change_handle = setTimeout(video_src_change, 1000);
    });

    $('#scene_loop_fade').on('click', function () {
        if (document.getElementById('scene_loop_fade').checked) {
            _AME.cur_select.scene_obj.apply_loop_fade = 1;
        } else {
            _AME.cur_select.scene_obj.apply_loop_fade = 0;
        }
    });

    $('#scene_scene_fade').on('click', function () {
        if (document.getElementById('scene_scene_fade').checked) {
            _AME.cur_select.scene_obj.apply_scene_fade = 1;
        } else {
            _AME.cur_select.scene_obj.apply_scene_fade = 0;
        }
    });

    $('#scene_auto_func').on('keyup paste', function () { _AME.cur_select.scene_obj.auto_change_scene_func = document.getElementById('scene_auto_func').value; });
    $('#scene_show_func').on('keyup paste', function () { _AME.cur_select.scene_obj.scene_show_func = document.getElementById('scene_show_func').value; });
    $('#scene_hide_func').on('keyup paste', function () { _AME.cur_select.scene_obj.scene_hide_func = document.getElementById('scene_hide_func').value; });
    $('#scene_comm_bar_func').on('keyup paste', function () { _AME.cur_select.scene_obj.scene_comm_bar_func = document.getElementById('scene_comm_bar_func').value; });

    $('#end_scene').on('click', function () {
        if (document.getElementById('end_scene').checked) {
            _AME.cur_select.scene_obj.end_scene = 1;
        } else {
            _AME.cur_select.scene_obj.end_scene = 0;
        }
    });

    //$('#img_title').val(_AME.cur_select.image_obj.title);            
    $('#img_title').on('keyup paste', function () {
        var old_title = _AME.cur_select.image_obj.title;
        _AME.cur_select.image_obj.title = document.getElementById('img_title').value;
        _AM.images[_AME.cur_select.image_obj.title] = _AME.cur_select.image_obj;
        delete _AM.images[old_title];
    });

    //$('#img_start_time').val(_AME.cur_select.image_obj.start_time);
    $('#img_start_time').on('keyup paste', function () {
        _AME.cur_select.image_obj.start_time = document.getElementById('img_start_time').value;
        //synchronize start time across image_groups.
        for (var key in _AME.cur_select.scene_obj.images) {
            if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
                if (_AME.cur_select.scene_obj.images[key].image_group == _AME.cur_select.image_obj.image_group) {
                    _AME.cur_select.scene_obj.images[key].start_time = _AME.cur_select.image_obj.start_time;
                    //_AME.cur_select.scene_obj.images[key].end_time = _AME.cur_select.image_obj.end_time;
                }
            }
        }
        $('#position').val(Math.floor(_AME.cur_select.image_obj.start_time * 100.00));
        //video_pos_playback_change();
    });

    $('#img_end_time').on('keyup paste', function () {
        _AME.cur_select.image_obj.end_time = document.getElementById('img_end_time').value;

        //synchronize end time across image_groups.
        for (var key in _AME.cur_select.scene_obj.images) {
            if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
                if (_AME.cur_select.scene_obj.images[key].image_group == _AME.cur_select.image_obj.image_group) {
                    //_AME.cur_select.scene_obj.images[key].start_time = _AME.cur_select.image_obj.start_time;
                    _AME.cur_select.scene_obj.images[key].end_time = _AME.cur_select.image_obj.end_time;
                }
            }
        }
        $('#position').val(Math.floor(_AME.cur_select.image_obj.end_time * 100.00));
        //video_pos_playback_change();
    });

    $('#img_image_src').on('keyup paste', function () { _AME.cur_select.image_obj.image_src = document.getElementById('img_image_src').value; });

    $('#img_width').on('keyup paste', function () { _AME.cur_select.image_obj.width = document.getElementById('img_width').value; });
    $('#img_height').on('keyup paste', function () { _AME.cur_select.image_obj.height = document.getElementById('img_height').value; });
    $('#img_animate_shape').on('keyup paste', function () {
        try {
            var shp = JSON.parse(document.getElementById('img_animate_shape').value);
            if (shp) {
                _AME.cur_select.shape_obj = shp;
            }
        } catch (err) {
            //fail silently, probably still constructing the string.
        }
    });

    $('#img_show_ctrl_points').on('click', function () {
        var vid = _AM.video_streams[0];
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    });
    $('#img_show_points').on('click', function () {
        var vid = _AM.video_streams[0];
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    });
    $('#img_show_handle_point').on('click', function () {
        var vid = _AM.video_streams[0];
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    });

    $('#img_name_of_person').on('keyup paste', function () { _AME.cur_select.image_obj.name_of_person = document.getElementById('img_name_of_person').value; });

    $('#img_sentence').on('keyup paste', sentence_change);    
    $('#img_disp_lines').on('keyup paste', disp_lines_change); //this is a calculated value... and only determined after the sentence is drawn.

    //$('#img_clip_box').val(JSON.stringify(_AME.cur_select.image_obj.sent_clip_box));

    $('#img_animate_shape_class').on('keyup paste', function () {
        _AME.cur_select.image_obj.animate_shape_class = document.getElementById('img_animate_shape_class').value;
        clearTimeout(css_change_handle);
        css_change_handle = setTimeout(css_change, 1000);
    });


    $('#img_image_group').on('keyup paste', function () {
        _AME.cur_select.image_obj.image_group = document.getElementById('img_image_group').value;
        _AME.cur_select.image_obj.hide_image_groups = document.getElementById('img_image_group').value;
        if (keypress_image_group) {
            clearTimeout(keypress_image_group);
        }
        keypress_image_group = setTimeout(image_group_typed, 800);
    });
    $('#img_next_image_group').on('keyup paste', function () { _AME.cur_select.image_obj.next_image_group = document.getElementById('img_next_image_group').value; });
    $('#img_hide_image_groups').on('keyup paste', function () { _AME.cur_select.image_obj.hide_image_groups = document.getElementById('img_hide_image_groups').value; });

    $('#img_can_select').on('click', function () {
        if (document.getElementById('img_can_select').checked) {
            _AME.cur_select.image_obj.sent_can_select = 1;
        } else {
            _AME.cur_select.image_obj.sent_can_select = 0;
        }
    });

    $('#img_revealed_idx').on('keyup paste', function () {
        _AME.cur_select.image_obj.sent_revealed_idx = document.getElementById('img_revealed_idx').value;
        _AME.cur_select.image_obj.editor_revealed_idx = document.getElementById('img_revealed_idx').value;
    });

    $('#img_is_scramble').on('click', function () {
        if (document.getElementById('img_is_scramble').checked) {
            _AME.cur_select.image_obj.editor_is_scramble = 1;
        } else {
            _AME.cur_select.image_obj.editor_is_scramble = 0;
        }
    });

    $('#img_karma').on('keyup paste', function () { _AME.cur_select.image_obj.karma = document.getElementById('img_karma').value; });
    $('#img_needed').on('keyup paste', function () { _AME.cur_select.image_obj.needed = document.getElementById('img_needed').value; });

    $('#img_loop_animate').on('click',
            function () {
                if (document.getElementById('img_loop_animate').checked) {
                    _AME.cur_select.image_obj.loop_animate = 1;
                } else {
                    _AME.cur_select.image_obj.loop_animate = 0;
                }
            });

    $('#img_pause_while_wait').on('click',
    function () {
        if (document.getElementById('img_pause_while_wait').checked) {
            _AME.cur_select.image_obj.pause_while_wait = 1;
        } else {
            _AME.cur_select.image_obj.pause_while_wait = 0;
        }
    });

    $('#img_prop_bag').on('keyup paste', function () { _AME.cur_select.image_obj.prop_bag = document.getElementById('img_prop_bag').value; });
    $('#img_prop_bag_scene_change').on('keyup paste', function () { _AME.cur_select.image_obj.prop_bag_scene_change = document.getElementById('img_prop_bag_scene_change').value; });
    

    $('#img_done_waiting').on('click',
           function () {
               if (document.getElementById('img_done_waiting').checked) {
                   _AME.cur_select.image_obj.done_waiting = 1;
               } else {
                   _AME.cur_select.image_obj.done_waiting = 0;
               }
           });

    $('#img_hide_all_images').on('click',
            function () {
                if (document.getElementById('img_hide_all_images').checked) {
                    _AME.cur_select.image_obj.hide_all_images = 1;
                } else {
                    _AME.cur_select.image_obj.hide_all_images = 0;
                }
            });

    $('#scene_search').on('keyup paste', function () {
        if ($('#scene_search').val() == '') {
            //empty string, remove next scene.
            _AME.cur_select.image_obj.fkuidGroup_t_catalog_to_scene = null;
            _AME.cur_select.image_obj.to_scene_video_src = "";
            reset_image_group_display();
        }
    });

    $('#img_change_from').on('keyup paste', function () {
        _AME.cur_select.image_obj.to_scene_from = document.getElementById('img_change_from').value;
        $('#range_from').val(Math.floor(_AME.cur_select.image_obj.to_scene_from * 100.00));
        video_pos_change();
    });

    $('#img_change_to').on('keyup paste', function () {
        _AME.cur_select.image_obj.to_scene_goto = document.getElementById('img_change_to').value;
        $('#range_to').val(Math.floor(_AME.cur_select.image_obj.to_scene_goto * 100.00));
        video2_pos_change();
    });

    $('#img_scale_to_scene').on('keyup paste', function () { _AME.cur_select.image_obj.scale_to_scene = document.getElementById('img_scale_to_scene').value; });

    $('#img_offset_x_next_scene').on('keyup paste', function () { _AME.cur_select.image_obj.off_set_x_to_scene = document.getElementById('img_offset_x_next_scene').value; });
    $('#img_offset_y_next_scene').on('keyup paste', function () { _AME.cur_select.image_obj.off_set_y_to_scene = document.getElementById('img_offset_y_next_scene').value; });

    $('#img_show_sound').on('keyup paste', function () { _AME.cur_select.image_obj.image_show_sound = document.getElementById('img_show_sound').value; });    
    $('#img_show_func').on('keyup paste', function () { _AME.cur_select.image_obj.image_show_func = document.getElementById('img_show_func').value; });

    $('#img_select_sound').on('keyup paste', function () { _AME.cur_select.image_obj.image_select_sound = document.getElementById('img_select_sound').value; });
    $('#img_select_func').on('keyup paste', function () { _AME.cur_select.image_obj.image_select_func = document.getElementById('img_select_func').value; });
    $('#img_hide_func').on('keyup paste', function () { _AME.cur_select.image_obj.image_hide_func = document.getElementById('img_hide_func').value; });


    $('#tposition').on('keyup paste', function () {
        clearTimeout(keypress_timer);
        keypress_timer = setTimeout(function () {
        try {
            document.getElementById('position').value = document.getElementById('tposition').value * 100; var vid = _AM.video_streams[0]; vid.currentTime = (document.getElementById('tposition').value);
        } catch (e) {
        }
        }, 1000);
    });
    $('#trange_from').on('keyup paste', function () {
        clearTimeout(keypress_timer);
        keypress_timer = setTimeout(function () {
        try {
            document.getElementById('range_from').value = document.getElementById('trange_from').value;
        } catch (e) {
        }
        }, 1000);
    });
    $('#trange_to').on('keyup paste', function () {
        clearTimeout(keypress_timer);
        keypress_timer = setTimeout(function () {
        try {
            document.getElementById('range_to').value = document.getElementById('trange_to').value * 100; var vid2 = _AM.video_streams[0]; vid2.currentTime = (document.getElementById('trange_to').value);
        } catch (e) {
        }
        }, 1000);
    });

    $('#position').on('change', function () { video_pos_playback_change(); });
    $('#range_from').on('change', function () { video_pos_change(); });
    $('#range_to').on('change', function () { video2_pos_change(); });    

    $('#divider').on('mousedown', function (event) {
        is_div_drag = true;

        last_div_position.x = event.clientX;
        last_div_position.y = event.clientY;

        last_div_width = $('#p_bar').width();
    });

    $(document).on('mousemove', function (event) {
        if (is_div_drag) {
            var pt = {};
            pt.x = event.clientX;
            pt.y = event.clientY;

            var disp_x = last_div_position.x - pt.x;

            $('#p_bar').width(last_div_width - disp_x);
            $('#divider').css('margin-left', (last_div_width - disp_x) + 'px');
            $('#story').css('margin-left', (last_div_width - disp_x + $('#divider').width()) + 'px');
        }
    });

    $(document).on('mouseup', function (event) { is_div_drag = false; });

}

function is_ctrl_point(shape, i) {
    var com_idx = find_previous_path_node(shape, i);

    var com = shape.com[i].replace(' ', '')
    switch (com) {
        case "M":
            return false;
        case "L":
            return false;
        case "C":
            //(x1 y1 x2 y2 x y)+
            //cubic Bézier curve from the current point to (x,y) using (x1,y1) as the control point at the beginning of the curve and (x2,y2) as the control point at the end of the curve                    
            if (i < com_idx + 4) {
                return true;
            }

        case "S":
            //(x2 y2 x y)+
            // cubic Bézier curve from the current point to (x,y). (x2,y2) is the second control point 
            if (i < com_idx + 2) {
                return true;
            }
        case "Q":
            //(x1 y1 x y)+
            // a quadratic Bézier curve from the current point to (x,y) using (x1,y1) as the control point
            if (i < com_idx + 2) {
                return true;
            }
        case "T":

            //(x y)+
            // quadratic Bézier curve from the current point to (x,y). 
            return false;
    }
}

function delete_node(shape, i) {
    var delete_points = 0;
    if (i < shape.com.length) {
        var com = shape.com[i].replace(' ', '')
        switch (com) {
            case "M":
                delete_points = 2;
                break;
            case "L":
                delete_points = 2;
                break;
            case "C":
                //(x1 y1 x2 y2 x y)+
                //cubic Bézier curve from the current point to (x,y) using (x1,y1) as the control point at the beginning of the curve and (x2,y2) as the control point at the end of the curve
                delete_points = 6;
                break;
            case "S":
                //(x2 y2 x y)+
                // cubic Bézier curve from the current point to (x,y). (x2,y2) is the second control point 
                delete_points = 4;
                break;
            case "Q":
                //(x1 y1 x y)+
                // a quadratic Bézier curve from the current point to (x,y) using (x1,y1) as the control point
                delete_points = 4;
                break;
            case "T":

                //(x y)+
                delete_points = 2;
                // quadratic Bézier curve from the current point to (x,y). 
                break;
        }
        shape.com.splice(i, delete_points);
        shape.num.splice(i, delete_points);
    }
}

function find_previous_path_node(animate_shape, i) {
    var com;
    for (var j = i - 1; j >= 0; j--) {
        com = animate_shape.com[j].replace(' ', '')
        if (com != ",") {
            return j;
        }
    }
}


function get_last_path_node(animate_shape) {
    var com;
    for (var i = animate_shape.com.length - 1; i >= 0; i--) {
        com = animate_shape.com[i].replace(' ', '')
        if (com != "Z" && com != ",") {
            //found last command...
            switch (com) {
                case "M":
                    return i + 2;

                case "L":
                    return i + 2;

                case "C":
                    //(x1 y1 x2 y2 x y)+
                    //cubic Bézier curve from the current point to (x,y) using (x1,y1) as the control point at the beginning of the curve and (x2,y2) as the control point at the end of the curve
                    return i + 6;

                case "S":
                    //(x2 y2 x y)+
                    // cubic Bézier curve from the current point to (x,y). (x2,y2) is the second control point 
                    return i + 4;

                case "Q":
                    //(x1 y1 x y)+
                    // a quadratic Bézier curve from the current point to (x,y) using (x1,y1) as the control point
                    return i + 4;

                case "T":

                    //(x y)+
                    return i + 2;
                    // quadratic Bézier curve from the current point to (x,y). 

            }
        }
    }
}

function get_previous_control_point(idx) {
    var pt = {};

    for (var i = idx - 1; i >= 0; i--) {
        if (_AME.cur_select.shape_obj.com[i] == " C") {
            pt.x = _AME.cur_select.shape_obj.num[i + 4] + (_AME.cur_select.shape_obj.num[i + 4] - _AME.cur_select.shape_obj.num[i + 2]);
            pt.y = _AME.cur_select.shape_obj.num[(i + 1) + 4] + (_AME.cur_select.shape_obj.num[(i + 1) + 4] - _AME.cur_select.shape_obj.num[(i + 1) + 2]);

            return pt;
        } else if (_AME.cur_select.shape_obj.com[i] == " L" || _AME.cur_select.shape_obj.com[i] == " M") {
            pt.x = _AME.cur_select.shape_obj.num[i];
            pt.y = _AME.cur_select.shape_obj.num[i + 1];

            return pt;
        }

    }

}

function svg_controls_off() {
    is_mouse_down = false;
    mouse_grab_type = "";
    is_add_new_node = false;

    if (svg_pencil_active) {
        //deactivating delete last node.
        var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
        $(_AME.cur_select.circle_obj).remove();
        delete_node(_AME.cur_select.shape_obj, point_idx);
        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        //update screen.
        var vid = _AM.video_streams[0];
        _AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    }

    svg_scale_active = false;
    svg_rotate_active = false;
    svg_pencil_active = false;
    svg_pan_active = false;

    is_add_new_node = false;
    last_angle = 0;
    new_angle = 0;

    $('#svg_rotate').removeClass("active");
    $('#svg_scale').removeClass("active");
    $('#svg_pencil').removeClass("active");
    $('#svg_pan').removeClass("active");
}

_AME.svg_rotate = function svg_rotate() {
    var prev_state = svg_rotate_active;
    svg_controls_off();    
    svg_rotate_active = !prev_state;
    if (svg_rotate_active) {
        $('#svg_rotate').addClass("active");
        _AME.cur_select.square_obj_me = null;
        _AME.cur_select.square_obj_opp = null;
        last_center = {};
        var bbox = get_path_box(_AME.cur_select.shape_obj);
        last_center.x = bbox.x + bbox.width / 2.0;
        last_center.y = bbox.y + bbox.height / 2.0;
        last_rad = Math.sqrt((bbox.width / 2.0) * (bbox.width / 2.0) + (bbox.height / 2.0) * (bbox.height / 2.0));
    }

    var vid = _AM.video_streams[0];
    show_points(_AME.cur_select.image_obj, vid.currentTime);
}

_AME.svg_scale = function svg_scale() {
    var prev_state = svg_scale_active;
    svg_controls_off();    
    svg_scale_active = !prev_state;
    if (svg_scale_active) {
        $('#svg_scale').addClass("active");
    }

    var vid = _AM.video_streams[0];
    show_points(_AME.cur_select.image_obj, vid.currentTime);
}

function svg_rotate_helper(cp, theta)
{
    var s = Math.sin(theta);
    var c = Math.cos(theta);

    if (_AME.cur_select.shape_obj) {
        var vid = _AM.video_streams[0];
        vid.currentTime;

        for (var i = 2; i < _AME.cur_select.shape_obj.num.length; i+=2) {           
            // translate point to origin:            
            var t_x = (last_svg_path_obj.num[i]   - cp.x);
            var t_y = (last_svg_path_obj.num[i+1] - cp.y);            

            // rotate point
            var new_x = t_x * c - t_y * s;
            var new_y = t_x * s + t_y * c;

            // translate point back to be back around original center:
            _AME.cur_select.shape_obj.num[i] = new_x + cp.x;
            _AME.cur_select.shape_obj.num[i+1] = new_y + cp.y;
        }

        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    }
}

function svg_scale_helper(cp_x, cp_y, scale_x, scale_y) {
    if (_AME.cur_select.shape_obj) {
        var vid = _AM.video_streams[0];
        vid.currentTime;

        for (var i = 2; i < _AME.cur_select.shape_obj.num.length; i += 2) {
            // translate point to origin:            
            var t_x = (last_svg_path_obj.num[i] - cp_x);
            var t_y = (last_svg_path_obj.num[i + 1] - cp_y);

            // rotate point
            var new_x = t_x * scale_x;
            var new_y = t_y * scale_y;

            // translate point back to be back around original center:
            _AME.cur_select.shape_obj.num[i] = new_x + cp_x;
            _AME.cur_select.shape_obj.num[i + 1] = new_y + cp_y;
        }

        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    }
}

function get_path_box(path_obj)
{
    var svg_path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); //Create a path in SVG's namespace
    svg_path.setAttributeNS(null, 'd', convert_path_obj_to_d(path_obj, 2)); //Set path's data   
    svg_path.setAttributeNS(null, 'class', anim_shape_class + '_path');
    document.getElementById('story_svg').appendChild(svg_path);
    var bbox = svg_path.getBBox();
    document.getElementById('story_svg').removeChild(svg_path);
    return bbox;
}

//ignores first move command assumed to be in path.
function get_path_center(path_obj) {
    var bbox = get_path_box(path_obj);
    var pt = {};
    pt.x = bbox.x + bbox.width / 2.0;
    pt.y = bbox.y + bbox.height / 2.0;

    return pt;
}


_AME.svg_flip_horizontal = function svg_flip_horizontal() {
    if (_AME.cur_select.shape_obj) {
        var vid = _AM.video_streams[0];
        vid.currentTime;

        //get bounding box.
        var svg_path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); //Create a path in SVG's namespace
        svg_path.setAttributeNS(null, 'd', convert_path_obj_to_d(_AME.cur_select.shape_obj, 2)); //Set path's data   
        svg_path.setAttributeNS(null, 'class', anim_shape_class + '_path');
        document.getElementById('story_svg').appendChild(svg_path);
        var bbox = svg_path.getBBox();
        var mid_x = bbox.x + (bbox.width / 2.0);
        document.getElementById('story_svg').removeChild(svg_path);

        //skip initial move co-ordinates, flip the rest. => i=2
        for (var i = 2; i < _AME.cur_select.shape_obj.num.length; i++) {
            //only on x values.
            if (!(i % 2)) {
                _AME.cur_select.shape_obj.num[i] = mid_x + (mid_x - _AME.cur_select.shape_obj.num[i]);
            }
        }

        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        show_points(_AME.cur_select.image_obj, vid.currentTime);
        //_AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
    }    
}

_AME.svg_flip_vertical = function svg_flip_vertical() {
    if (_AME.cur_select.shape_obj) {
        var vid = _AM.video_streams[0];
        vid.currentTime;

        //get bounding box.
        var svg_path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); //Create a path in SVG's namespace
        svg_path.setAttributeNS(null, 'd', convert_path_obj_to_d(_AME.cur_select.shape_obj, 2)); //Set path's data   
        svg_path.setAttributeNS(null, 'class', anim_shape_class + '_path');
        document.getElementById('story_svg').appendChild(svg_path);
        var bbox = svg_path.getBBox();
        var mid_y = bbox.y + (bbox.height / 2.0);
        document.getElementById('story_svg').removeChild(svg_path);

        //skip initial move co-ordinates, flip the rest. => i=2
        for (var i = 2; i < _AME.cur_select.shape_obj.num.length; i++) {
            //only on y values.
            if ((i % 2)) {
                _AME.cur_select.shape_obj.num[i] = mid_y + (mid_y - _AME.cur_select.shape_obj.num[i]);
            }
        }

        _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));
        show_points(_AME.cur_select.image_obj, vid.currentTime);
        //_AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
    }
}


_AME.svg_pan_reset = function svg_pan_reset() {
    svg_controls_off();
    //svg_pan_active = false;
    pan_mouse_is_down = false;

    document.getElementById('story_svg').setAttributeNS(null, 'viewBox', 0 + ' ' + 0 + ' ' + video_int_width + ' ' + video_int_height);

    _AM.video_streams[0].style.marginTop = "0px";
    _AM.video_streams[0].style.marginLeft = "0px";
    _AM.video_streams[1].style.marginTop = "0px";
    _AM.video_streams[1].style.marginLeft = "0px";

    var vid = _AM.video_streams[0];
    show_points(_AME.cur_select.image_obj, vid.currentTime);
}

_AME.svg_pan = function svg_pan() {  
    var prev_state =  svg_pan_active;
    svg_controls_off();    
    svg_pan_active = !prev_state;    
    if (svg_pan_active) {
        $('#svg_pan').addClass("active");
    }

    var vid = _AM.video_streams[0];
    show_points(_AME.cur_select.image_obj, vid.currentTime);
}

_AME.svg_pencil = function svg_pencil() {
    var prev_state = svg_pencil_active;
    svg_controls_off();
    svg_pencil_active = !prev_state;
    if (svg_pencil_active) {
        if (_AME.cur_select.image_obj.animate_shape.length > 1) {
            if (confirm('Using the pencil tool now will reset the other time frames. Are you sure you want to continue?')) {

                //clear the other time frames.                        
                _AME.cur_select.image_obj.animate_shape.splice(1, _AME.cur_select.image_obj.animate_shape.length - 1);

                //need to update the time frame list.
                get_time_frames(_AME.cur_select.image_obj.animate_shape, document.getElementById('time_select'), _AME.click_time_frame, _AME.cur_select, true);
                _AME.cur_select.shape_obj = null;
                set_selected_shape(_AME.cur_select.image_obj.animate_shape[0], document.getElementById('time_select_0'), _AME.cur_select);
                update_animate_image(1);

                $('#svg_pencil').addClass("active");
                add_node("M");
            } else {
                svg_pencil_active = false;
                $('#svg_pencil').removeClass("active");
            }
        } else {
            $('#svg_pencil').addClass("active");
            add_node("M");
        }
    } else {
        //deactivating delete last node.
        var point_idx = parseInt(_AME.cur_select.circle_obj.getAttributeNS(null, 'data-idx'));
        $(_AME.cur_select.circle_obj).remove();
        delete_node(_AME.cur_select.shape_obj, point_idx);
        //update screen.
        var vid = _AM.video_streams[0];
        _AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
        show_points(_AME.cur_select.image_obj, vid.currentTime);
    }
}

function add_node(node_type) {
    is_add_new_node = true;

    //document.getElementById('svg_points').appendChild(circle);
    var lastPos = 0;
    add_node_type = node_type;
    switch (node_type) {
        case "Z":
            //add_node_type = "Z";
            last_pos = get_last_path_node(_AME.cur_select.shape_obj);
            _AME.cur_select.shape_obj.num[last_pos] = null;
            _AME.cur_select.shape_obj.num[last_pos + 1] = null;
            _AME.cur_select.shape_obj.com[last_pos] = " Z";
            _AME.cur_select.shape_obj.com[last_pos + 1] = " ";
            //mouse_grab_type = "point";
            _AME.cur_select.image_obj.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(_AME.cur_select.shape_obj));

            break;
        case "M":
            // add_node_type = "M";
            count_ctrl_points = 0;
            last_pos = get_last_path_node(_AME.cur_select.shape_obj);
            _AME.cur_select.shape_obj.num[last_pos] = -10;
            _AME.cur_select.shape_obj.num[last_pos + 1] = -10;
            _AME.cur_select.shape_obj.com[last_pos] = " M";
            _AME.cur_select.shape_obj.com[last_pos + 1] = " ";
            mouse_grab_type = "point";

            break;
        case "L":
            //add_node_type = "L";
            count_ctrl_points = 0;
            last_pos = get_last_path_node(_AME.cur_select.shape_obj);
            _AME.cur_select.shape_obj.num[last_pos] = -10;
            _AME.cur_select.shape_obj.num[last_pos + 1] = -10;
            _AME.cur_select.shape_obj.com[last_pos] = " L";
            _AME.cur_select.shape_obj.com[last_pos + 1] = " ";
            mouse_grab_type = "point";

            break;
        case "C":
            last_pos = get_last_path_node(_AME.cur_select.shape_obj);

            //need to check if C was previous command to get x1, y1 from by default.
            var pt = get_previous_control_point(last_pos);
            //if there was no C previously, then get it from last moveto position.


            _AME.cur_select.shape_obj.com[last_pos] = " C";
            _AME.cur_select.shape_obj.num[last_pos] = pt.x;      //x1
            _AME.cur_select.shape_obj.num[last_pos + 1] = pt.y;  //y1
            _AME.cur_select.shape_obj.com[last_pos + 1] = " ";

            _AME.cur_select.shape_obj.com[last_pos + 2] = " ";
            _AME.cur_select.shape_obj.num[last_pos + 2] = -10;  //x2
            _AME.cur_select.shape_obj.num[last_pos + 3] = -10;  //y2
            _AME.cur_select.shape_obj.com[last_pos + 3] = " ";

            _AME.cur_select.shape_obj.com[last_pos + 4] = " ";
            _AME.cur_select.shape_obj.num[last_pos + 4] = -10;  //x
            _AME.cur_select.shape_obj.num[last_pos + 5] = -10;  //y
            _AME.cur_select.shape_obj.com[last_pos + 5] = " ";

            last_pos += 4;

            //(x1 y1 x2 y2 x y)+
            //cubic Bézier curve from the current point to (x,y) using (x1,y1) as the control point at the beginning of the curve and (x2,y2) as the control point at the end of the curve
            count_ctrl_points = 2;

            mouse_grab_type = "curve_to_point";
            break;

        default:
            //intentionally left blank.
            break;
    }

    var vid = _AM.video_streams[0];
    _AM.scene_coarse_engine_editor(_AME.cur_select.image_obj.image_group);
    show_points(_AME.cur_select.image_obj, vid.currentTime);

    is_mouse_down = true;
    _AME.cur_select.circle_obj = document.getElementById('select_points_' + last_pos);

    //$(circle).on('click', mouse_up);
}

_AME.svg_copy = function svg_copy() {
    svg_copy_active = !svg_copy_active;

    if (svg_copy_active) {
        $('#save_list').addClass("active");
    } else {
        $('#save_list').removeClass("active");
    }

    //Copy occurs in set_selected_image
}

_AME.svg_paste = function svg_paste() {
    //svg_copy_active = !svg_copy_active;

    /*if (svg_copy_active) {
        $('#save_list').addClass("active");
    } else {
        $('#save_list').removeClass("active");
    }*/

    //TODO: Perform the paste, images are stored in variable paste_bin
    show_working();
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: _ajax_url_get_unique_titles + "/" + c1 + "/" + session_id + "/",
        data: JSON.stringify(paste_bin_comp),
        scene_obj: _AME.cur_select.scene_obj,
        success: function (data) {
            //now match up the new result title:guids and paste them into the new scene.
            paste_bin_comp = JSON.parse(data);

            //merge the images into the currently selected scene.
            for (var i = 0; i < paste_bin_comp.length; i++) {
                var img = JSON.parse(paste_bin[paste_bin_comp[i].reference.replace(/-/g, '_')]);
                img.title = paste_bin_comp[i].title;
                img.uidGroup = null;
                img.fkuidGroup_t_catalog_scene = this.scene_obj.uidGroup;
                //img.fkuidGroup_t_catalog_to_scene = null;
                img.scene_title = this.scene_obj.title;
                this.scene_obj.images[img.title] = img;
            }

            save_scene(this.scene_obj);
        },
        error: function (error) {
            jsonValue = JSON.parse(error.responseText);
            //jError('An error has occurred while saving the new part source: ' + jsonValue, { TimeShown: 3000 });
        }
    });
}

_AME.set_screen_size = function set_screen_size(v) {
    $('#story_movie_size').val(v);
}

_AME.select_image_group = function select_image_group(for_id, v) {
    $('#' + for_id).val(v);

    if (for_id == 'img_image_group') {
        $('#img_hide_image_groups').val(v);
        _AME.cur_select.image_obj.image_group = v;
        _AME.cur_select.image_obj.hide_image_groups = v;

        //get the start time from another image.
        for (var key in _AME.cur_select.scene_obj.images) {
            if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
                if (_AME.cur_select.scene_obj.images[key].uidGroup != _AME.cur_select.image_obj.uidGroup &&
                   _AME.cur_select.scene_obj.images[key].image_group == v) {
                    //found match for group, take the value of start and finish.
                    _AME.cur_select.image_obj.start_time = _AME.cur_select.scene_obj.images[key].start_time;
                    _AME.cur_select.image_obj.end_time = _AME.cur_select.scene_obj.images[key].end_time;

                    $('#img_start_time').val(_AME.cur_select.image_obj.start_time);
                    $('#img_end_time').val(_AME.cur_select.image_obj.end_time);
                    break;
                }
            }
        }

        
        reset_image_group_display();
    } else {
        _AME.cur_select.image_obj.next_image_group = v;
    }
}

function get_image_groups(id, for_id) {
    var group_names = {};
    var ddl = $('#' + id);
    $(ddl).empty();

    //go through all images.
    for (var key in _AME.cur_select.scene_obj.images) {
        if (_AME.cur_select.scene_obj.images.hasOwnProperty(key)) {
            //add the groupname.
            var im = _AME.cur_select.scene_obj.images[key];
            if (im.image_group) {
                group_names[im.image_group] = true;
            }
            if (im.next_image_group) {
                group_names[im.next_image_group] = true;
            }
        }
    }

    for (var key in group_names) {
        if (group_names.hasOwnProperty(key)) {
            var li = document.createElement('li');
            $(li).html("<a href='' onclick=\"_AME.select_image_group('" + for_id + "', '" + key + "'); return false;\">" + key + "</a>");
            $(ddl).append(li);
        }
    }
}


function restore_menu_settings() {
    //_AME.save_story_settings();

    if (!("scramble_mode" in window._story_settings)) {
        //store.set_local(session_id, "scramble_mode", 1);
        window._story_settings["scramble_mode"] = 1;
    }
    _AM.scramble_mode = parseInt(window._story_settings["scramble_mode"]);

    if (!("audio_stream_volume" in window._story_settings)) {
        //store.set_local(session_id, "audio_stream_volume", 80);
        window._story_settings["audio_stream_volume"] = 80;
    }
    _AM.audio_stream_volume = parseFloat(window._story_settings["audio_stream_volume"]) / 100.00;

    if (!("video_stream_volume" in window._story_settings)) {
        //store.set_local(session_id, "video_stream_volume", 80);
        window._story_settings["video_stream_volume"] = 80;
    }
    _AM.video_stream_volume = parseFloat(window._story_settings["video_stream_volume"]) / 100.00;
}

}(window._AME = window._AME || {}, jQuery));
window._AME_loaded = true;