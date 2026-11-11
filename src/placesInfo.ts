/** 精选地点的介绍与照片（2026-10-15 润色：客观介绍+一句特色；官方实据已核实来源）。
 *  2026-10-24 增加英文 descEn（双语版）。 */

export interface PlaceInfo {
  desc: string;
  descEn?: string;
  photo?: string;
}

export const REFINEMENT_INFO: Record<string, PlaceInfo> = {
  第五教学楼: {
    desc: "精修五教正门的石柱柱头、基座、檐口和阳台栏杆。保留高主楼、低翼楼和灰瓦坡屋顶，构件尺寸暂估。",
    descEn: "The entrance capitals, pedestals, cornice and balustrade are refined. The taller central block and lower tiled wings retain their earlier massing. Dimensions are approximate.",
  },
  文字斋: {
    desc: "参考 2026 年修缮初验照片精修门廊、椽头、朱红柱和台基。柱距与檐高暂估。",
    descEn: "Rafter ends, red posts, plinth and porch details follow the 2026 conservation photographs. Spacing and eave heights are approximate.",
  },
  风雨操场: {
    desc: "在下沉半环看台和舞台基础上补上雨棚侧桁架、前横梁和校史墙。看台排数、墙位与标高暂估。",
    descEn: "Canopy trusses, the front lattice and the campus history wall complement the sunken amphitheatre. Row count, wall placement and elevations are approximate.",
  },
  思群广场: {
    desc: "参考改造后实拍调整跑道为亮蓝色，补上看台通道、白色分区编号和张拉罩棚。道数与局部地坪暂估。",
    descEn: "Photographs after the resurfacing inform the blue track, stair aisles, white section numbers and fabric canopy. Lane count and local grades are approximate.",
  },
};

export const PLACE_INFO: Record<string, PlaceInfo> = {
  虎溪科学中心: {
    desc: "校方资料确认最高十层、47.7 米。按建设航拍与效果图重做十栋高低塔楼、三层裙楼、竖向白框和内庭院。各塔楼轮廓、层高和入口地坪为影像估算。",
    descEn: "CQU documents a maximum of ten storeys and 47.7 m. Ten stepped towers, a three-storey podium, white fins and inner courts follow official imagery. Individual footprints, storey heights and entry levels are estimated.",
  },
  储能技术产教融合创新大楼: {
    desc: "校方公布地上八层、高 35.85 米。参考环评定位与效果图重做双庭院、架空连接、V 形支撑和屋顶绿化；修正原有过小体量及冲突的手工宿舍占位。轮廓和地坪为估算，竣工投用状态待核。",
    descEn: "CQU documents eight storeys above ground and 35.85 m. The EIA location and rendering guide the twin courts, raised link, V piers and planted roofs. The former undersized box and conflicting provisional dorms are corrected; outlines and grades are estimated, and opening status is unverified.",
  },
  荷园新食堂: {
    desc: "新建项目完成形态预览。校方 2026 年 7 月资料确认地上三层、总高 16.7 米，计划 2027 年投用；本版不表示已经营业。两个采光井参考封顶航拍，外墙细节、位置和入口地坪为估算。",
    descEn: "Preview of the intended completed building. CQU's July 2026 report confirms three above-ground storeys, 16.7 m and planned opening in 2027. Two light wells follow the construction aerial; facade details, placement and entry levels are estimated. This is not an operating canteen listing.",
  },
  西南部景观: {
    desc: "参考校方 2026 年西南景观改造照片补充园路、弧形低坐凳、木座椅、灯杆和分层绿化。局部布局及微地形为展示估算，尚未按测绘图配准。",
    descEn: "Garden paths, curved low seating, timber benches, lights and layered planting follow CQU's 2026 southwest landscape photographs. The local arrangement and microterrain are illustrative and have not been registered to a survey plan.",
  },
  第五教学楼: {
    desc: "A 区五教。预览按校方照片还原灰瓦坡屋顶、黄墙红窗和高主楼、低翼楼的层次。屋面和窗间尺寸为影像估算。",
    descEn: "Campus A Teaching Building No. 5. University photographs inform the grey tile roofs, yellow walls, red windows and the lower wings. Dimensions are approximate.",
  },
  文字斋: {
    desc: "预览依据校方 2026 年修缮初验照片和资料，重建工字形体量、青瓦歇山顶、青砖和朱红柱开敞檐廊。构件尺寸为影像估算。",
    descEn: "The model follows the university's 2026 conservation inspection photographs and notes, including the I-shaped plan, grey tiled hip-and-gable roofs and the open veranda with red columns. Dimensions are approximate.",
  },
  风雨操场: {
    desc: "体育馆旁的半环形露天剧场。根据校方照片重建下沉场地、阶梯看台、放射形通道和曲面雨棚。台阶尺寸及标高暂估。",
    descEn: "A sunken, semicircular theatre beside the sports hall. Seating, aisles and the curved canopy follow university photographs. Step dimensions and elevations are approximate.",
  },
  思群广场: {
    desc: "设有跑道、足球场、弯道看台和有顶看台。周边按影像分段建模，台阶、挡墙尺寸和场地标高暂估。",
    descEn: "Track, football pitch and segmented seating including a covered grandstand. Steps, retaining walls and field elevations are approximate.",
  },
  "A区正门": {
    desc: "沙坪坝校区 A 区临沙正街的正门，靠近重庆大学地铁站 3 号口。地图标记为进场道路上的参考点。",
    descEn: "The main entrance to Campus A on Shazheng Street, near Exit 3 of Chongqing University metro station. The marker shows an approximate point on the entrance road.",
  },
  "A区学生九舍": {
    desc: "校方总平面图与影像将九舍定位在复合楼的东南翼。预览按屋面转角拆出九舍，内部产权分界与入口地坪待核。",
    descEn: "The campus plan and aerial imagery locate Dorm 9 in the southeast wing. The preview divides the footprint at the roof corners. Internal boundaries and entrance levels await verification.",
  },
  "学生三食堂": {
    desc: "按校方总平面图和影像建模为复合楼西北侧体量。楼层、立面和入口地坪仍待核。",
    descEn: "The campus plan and aerial imagery place the dining hall in the northwest portion of the building complex. Storeys, façades and entrance levels await verification.",
  },
  "美视电影学院剧场": {
    desc: "局部预览保留剧场的独立建筑轮廓，按校方照片和影像补出鼓座与圆顶。屋顶尺寸和台地标高为暂估。",
    descEn: "The corridor preview uses the mapped theatre footprint and models the drum and dome from university photography and aerial imagery. Roof dimensions and pad elevations are approximate.",
  },
  钟塔: {
    desc: "位于 A 区校前区轴线上的纪念钟塔，建于 1989 年，高约 24 米。地图标记位于钟塔景观范围内。",
    descEn: "A roughly 24-metre commemorative clock tower built in 1989 on the Campus A entrance axis. The marker indicates the clock tower precinct.",
  },
  重庆大学主教学楼: {
    desc: "A 区主教学楼，位于民主湖北侧。地图沿用现有楼栋轮廓与模型。",
    descEn: "The main teaching building of Campus A, north of Minzhu Lake. The map uses the existing building footprint and model.",
  },
  理工馆: {
    desc: "A 区理工图书馆，由西侧逸夫楼与东楼组成。地图使用理工馆整体轮廓，近景为概略模型。",
    descEn: "Campus A Science and Engineering Library, including the Yifu Building and the east wing. The simplified model follows the combined library footprint.",
  },
  民主湖: {
    desc: "位于 A 区思群广场旁的校园湖泊，民主湖报告厅在湖畔。",
    descEn: "A campus lake next to Siqun Square in Campus A, with the Minzhu Lake Lecture Hall on its shore.",
  },
  田径场: {
    desc: '体育馆旁的足球与田径场。参照校方航拍补充红色跑道、蓝色缓冲区、西侧小型白色膜棚、低平台及灯杆。现有场区位置保留，棚体、台阶和局部标高为估算。',
    descEn: 'Football and athletics beside the gym. CQU aerials guide the red track, blue apron, small west-side tensile canopy, low platform and floodlights; detailed dimensions and local grades are estimated.',
  },
  室外球场区: {
    desc: '篮球、网球等室外运动场地集中区域。场地位置与朝向沿用地图轮廓，面层配色和器材细节为示意。',
    descEn: 'Concentrated outdoor courts for basketball, tennis and more. Positions follow the mapped outlines; surface colors and equipment are illustrative.',
  },
  梅园运动场: {
    desc: '校方清单包含田径、大小足球、篮球、网球、排球、羽毛球及50张乒乓球台。本版沿用已映射的各场轮廓，补充围栏和球台；细部器材及球台内部排布为估算。',
    descEn: 'Mapped courts retained with fences and table-tennis facilities. CQU documents 50 tables; detailed equipment locations and table arrangement are estimated.',
  },
  松园运动场: {
    desc: '校方资料列有两处泳池、10片篮球场、16片羽毛球场、排球与气排球各2片及16张乒乓球台。本版保留场区外轮廓，补齐原空白场地区域；未映射的内部分隔位置为估算。',
    descEn: 'CQU lists two pools, ten basketball courts, sixteen badminton courts, four volleyball/soft-volleyball courts and sixteen tables. Outer mapped banks are retained; unmapped internal subdivisions are estimates.',
  },
  兰园运动场: {
    desc: '沿用四片篮球场和八片羽毛球场的现有轮廓，按校方资料补入16张乒乓球台及外围围栏。球台布点、围栏入口和局部地坪为估算；室内网球馆待可靠轮廓确认后补充。',
    descEn: 'Four mapped basketball and eight badminton courts, with sixteen documented tables and perimeter fences. Table positions, gates and ground grades are estimates; the indoor tennis hall awaits a verified footprint.',
  },
  第一教学楼: {
    desc: "云湖畔的五层教学楼群，楼翼与连廊围合两处内院。五层来自校方工程资料，本版补充了底层柱廊、内院栏杆和入口台阶，楼高与立面细部尺寸仍为估算。",
    descEn: "Five-storey teaching wings around two mapped courts by Cloud Lake. The storey count is documented by CQU. Colonnades, galleries and entry stairs are refined; total height and facade dimensions remain estimated.",
  },
  图书馆: {
    desc: "临湖的校园地标，高层板楼承托于低层基座之上，竖向遮阳构件形成鲜明的红色立面。入口柱廊、台阶及屋顶校名架参考公开照片，细部尺寸为估算。",
    descEn: "A lakeside landmark with a tall slab above a low podium and distinctive red vertical fins. The entrance colonnade, stairs and rooftop lettering frame follow published photographs; detailed dimensions are estimated.",
    photo: "photos/library.jpg",
  },
  信息技术科研楼: {
    desc: "白色外框、退后玻璃、穿孔遮阳板与下沉庭院构成教学科研空间。北侧钢连廊跨度 36 米、桁架高 9.4 米依据校方施工记录；整体楼高、层间距和局部地坪为估算。",
    descEn: "White outer frames, recessed glazing, perforated screens and a sunken courtyard. The north steel bridge's 36 m span and 9.4 m truss are documented by CQU; overall height, storey spacing and local grades remain estimated.",
    photo: "photos/info.jpg",
  },
  体育馆: {
    desc: "按校方照片精修外张金属屋盖、斜向格栅、采光带、玻璃门厅和西侧红砖台阶，并统一相邻三处附馆与体育街。整体楼高、附馆屋盖分格和入口标高为估算。",
    descEn: "An outward-sloping metal roof, diagonal fins, roof lights, glazed entrance and broad west-side brick stairs follow CQU photographs. Three adjacent halls and the sports street share one model; heights and fine dimensions remain estimated.",
    photo: "photos/gym.jpg",
  },
  学生活动中心: {
    desc: "红色弧形楼体、深窗洞与底层玻璃门厅。本版撤回按坐标线误改的整片白色楼翼和额外台阶，保留原有曲线轮廓。楼高与未见立面细节为估算。",
    descEn: "Red curved wings with recessed windows and a glazed base. This version removes the arbitrary white-wing split and unsupported extra stairs, preserving the mapped curved outline. Heights and unseen details remain estimated.",
    photo: "photos/activity.jpg",
  },
  艺术楼: {
    desc: "由相互咬合的 L 形楼翼组成，灰砖立面、架空层、红色钢桁架连桥与连接平台组织教学和交流空间。建模参考建筑师发布的照片，翼楼高度和连桥落点为估算。",
    descEn: "Interlocking L-shaped wings with grey-brick elevations, open ground floors, red truss bridges and shared decks. Modelled from the architect's published photographs; wing heights and bridge placement are estimated.",
  },
  工科大楼: {
    desc: "依据校方工科实验大楼交付照片精修，补入白色竖向框架、红色门框、高低楼翼和入口平台。校方使用资料能确认 C 栋二至七层，整体楼高、各翼尺寸和入口落点为估算。",
    descEn: "Refined from CQU engineering-complex handover photographs, with white vertical frames, red portals, stepped wings and an entry platform. C wing levels 2–7 are documented; total height, wing dimensions and entry placement are estimated.",
  },
  东门: {
    desc: "门柱广场式校门：四座石砌门柱列于广场之上，旗杆林立，是虎溪校园的东侧出入口。",
    descEn: "A plaza-style gate on the east side — four stone columns on an open plaza lined with flagpoles.",
    photo: "photos/gate_east.jpg",
  },
  北门: {
    desc: "位于大学城南路，复刻老校门的白色穿孔板门楼与红色校名是其标志。",
    descEn: "On Daxuecheng South Road — marked by the white perforated-panel arch replicating the historic campus gate and the red university name.",
    photo: "photos/gate_north.jpg",
  },
  西门: {
    desc: "松园宿舍区旁的西侧出入口，紧邻理科楼群与运动区。",
    descEn: "The west entrance by the Songyuan dormitory cluster, next to the science buildings and sports area.",
  },
  缙湖: {
    photo: "photos/jinhu.jpg",
    desc: "校园核心湖景，湖畔绿道与石径环绕，是图书馆倒影的取景位。",
    descEn: "The campus's core lake, ringed by waterfront paths and stone trails — the best spot for the library's reflection.",
  },
  云湖: {
    desc: "位于校园东北侧的开阔水面，沿湖草坪开阔，紧邻图书馆与植物园。",
    descEn: "An open water surface in the northeast of campus, with broad lawns along the shore near the library and botanical garden.",
  },
  荷苑: {
    desc: "夏季荷花盛开的园地，位于教学楼与宿舍区之间。",
    descEn: "A garden of summer lotus between the teaching buildings and dormitories.",
  },
  水生植物展示区: {
    desc: "缙湖与云湖之间的水生植物科普园区，栈道穿行其间。",
    descEn: "An aquatic-plant demonstration garden between Jin Lake and Cloud Lake, with boardwalks through the beds.",
  },
  综合楼: {
    desc: "集办公与公共教室于一体的综合楼宇。石材墙面、深窗洞与柱廊围合庭院；院落水池和台阶参考官网实拍，具体尺寸与楼高仍为估算。",
    descEn: "A complex of offices and shared classrooms. Stone walls, deep window reveals and a colonnade enclose a courtyard; the pool and steps follow official photos, while dimensions and height remain estimated.",
    photo: "photos/zonghelou.jpg",
  },
  理科楼: {
    desc: "数理学科教学科研楼，本版统一精修主体、西翼和南翼，补入灰色板材、水平遮阳百叶、大台阶及入口平台。附楼层数、立面分格和局部标高为估算。",
    descEn: "Science teaching and research buildings, refined as one main block with west and south wings. Grey panels, horizontal louvers and broad entry steps follow university photographs; annex levels and local dimensions remain estimated.",
    photo: "photos/likelou.jpg",
  },
  第一食堂: {
    desc: '竹园、梅园之间的第一食堂。校方2025年经营文件确认建筑共四层，一二层供餐、三四层用于学生活动；本版修正原两层模型，并精修窗洞、遮阳、屋顶排风及入口。总高度、屋顶细节和门厅位置为估算。',
    descEn: 'CQU documents four storeys: dining on levels 1-2, activities on 3-4. This version corrects the earlier two-storey model; total height, roof and entrance details remain estimated.',
  },
  第二食堂: {
    desc: '松园旁的第二食堂，本版按包含底部服务层的四层体量表现，补入立体窗洞、遮阳、入口雨棚和屋顶排风。完整层数、楼高和入口位置仍待完整外观核验。',
    descEn: 'A four-level display volume including a lower service level, with recessed windows, shading and entrance canopy. Complete storey count, height and doorway await exterior verification.',
  },
  第三食堂: {
    desc: '兰园与图书馆之间的第三食堂。保留斜置的现有轮廓和三层资料，精修深窗洞、挑檐、门厅与排风设施。总高度、立面细部及道路接入位置为估算。',
    descEn: 'The mapped rotated outline and three levels are retained, with refined window reveals, eaves, entrance and exhausts. Detailed dimensions and the road approach are estimated.',
  },
  莲池: {
    desc: '图书馆东北侧的小水面，官方图集中的校园一景。周边绿化为示意分布。',
    descEn: 'A small pond northeast of the Library, featured in the official campus gallery. Surrounding planting is illustrative.',
    photo: 'photos/lianchi.jpg',
  },
  重庆海吉亚肿瘤医院: {
    desc: '校园南侧的肿瘤专科医院（2018 年营业，地上 21 层）。橙红墙面与米白层间框依卫星影像与现场印象复原；塔楼/裙楼分段与窗带节奏为估算。',
    descEn: 'The oncology hospital south of campus (opened 2018, 21 storeys above ground). The orange-red walls and cream floor bands follow satellite imagery and on-site recollection; tower/podium split and window rhythm are estimated.',
  },
  医院门诊楼: {
    desc: '医院门诊楼，橙红体量与通长玻璃带依卫星暖色信号复原；与主楼间的连廊位置为推测。',
    descEn: 'The hospital outpatient building; the orange volume and glass band follow warm satellite signals; the link bridge position is estimated.',
  },
  第二实验楼: {
    desc: '教学区三层实验楼。白框平顶为通用实验楼形制（卫星证据不足，造型以推测为主）。',
    descEn: 'A three-storey lab building in the teaching quarter. The white-frame flat-roof idiom is generic (weak satellite evidence; design largely inferred).',
  },
  第三实验楼: {
    desc: '北区四层实验楼，红橙平顶暖色系依卫星影像复原；门窗节奏为估算。',
    descEn: 'A four-storey lab building in the north quarter; the orange flat-roof tone follows satellite imagery, window rhythm estimated.',
  },
  药学院: {
    desc: '教学区三层楼，红橙平顶暖色系依卫星影像复原；入口位置为推测。',
    descEn: 'A three-storey building with an orange flat roof from satellite imagery; entrance position estimated.',
  },
  药学院研究中心: {
    desc: '药学院研究楼，红橙平顶暖色系依卫星影像复原。',
    descEn: 'Pharmacy research block with an orange flat roof from satellite imagery.',
  },
  工程培训中心: {
    desc: '西区大跨两层厂房式工训中心。深檐带与山墙大玻璃门为推测（卫星屋面证据中等，平顶形态按厂房形制）。',
    descEn: 'A large two-storey workshop-style training centre in the west. Deep eaves and gable glazing are inferred (moderate satellite roof evidence).',
  },
  校医院: {
    desc: '校方科室表列有一、二层医疗空间。本版按两层门诊体量作保守估算，补充窗洞、门厅、绿色标识和步行接入口；完整长条楼是否含其他服务空间、楼高和入口位置仍需现场核对。',
    descEn: 'CQU lists clinical services on levels 1 and 2. The model uses a conservative two-level volume with recessed windows, an entrance and a pedestrian approach. The full mapped bar, height and doorway remain provisional.',
  },
};
