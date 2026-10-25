/** 精选地点的介绍与照片（2026-10-15 润色：客观介绍+一句特色；官方实据已核实来源）。
 *  2026-10-24 增加英文 descEn（双语版）。 */

export interface PlaceInfo {
  desc: string;
  descEn?: string;
  photo?: string;
}

export const PLACE_INFO: Record<string, PlaceInfo> = {
  田径场: {
    desc: '体育馆旁的田径场，跑道环绕足球内场。场区位置已结合校内反馈核对，跑道尺寸、道数及器材细节为比例估算。',
    descEn: 'The track-and-field ground beside the Gymnasium, with a running track around the football pitch. The location is verified with campus feedback; lane count and equipment are approximate.',
  },
  室外球场区: {
    desc: '篮球、网球等室外运动场地集中区域。场地位置与朝向沿用地图轮廓，面层配色和器材细节为示意。',
    descEn: 'Concentrated outdoor courts for basketball, tennis and more. Positions follow the mapped outlines; surface colors and equipment are illustrative.',
  },
  第一教学楼: {
    desc: "云湖畔的主要教学楼，五层楼群通过连廊相互连接，围合出庭院。五层来自校方工程资料；模型总高与部分外观细节仍为估算。",
    descEn: "A main teaching building by Cloud Lake — five storeys of interconnected wings joined by corridors around a courtyard. The height comes from university records; the model total and some facade details remain estimated.",
  },
  图书馆: {
    desc: "虎溪校区地标，通体朱红的 12 层板楼呈“L”形临缙湖而立，获中国建筑工程鲁班奖，是校内主要的学习与研究空间。",
    descEn: "The landmark of Huxi Campus: a vermilion 12-storey slab standing in an L-shape by Jin Lake. Winner of the China Construction Engineering Luban Award, it is the campus's main study and research space.",
    photo: "photos/library.jpg",
  },
  信息技术科研楼: {
    desc: "2022 年交付的信息类教学科研楼。白色框架、退后玻璃与穿孔铝板构成立面，连廊和庭院组织交流空间。模型总高仍按 OSM 层数推算。",
    descEn: "IT teaching-and-research building delivered in 2022. White frames, recessed glazing and perforated aluminium panels form the facade, with bridges and courtyards organizing shared spaces. Total height still derived from OSM levels.",
    photo: "photos/info.jpg",
  },
  体育馆: {
    desc: "虎溪体育中心主场馆，“学位帽”造型——上部方整的钻石形屋盖、下部红砖曲线基座，内设比赛馆与球类训练区，是运动会与体测的主要场地。",
    descEn: "The main venue of the Huxi Sports Center — a \"graduation-cap\" form with a faceted diamond roof over a curved red-brick base, hosting competitions, training and fitness tests.",
    photo: "photos/gym.jpg",
  },
  学生活动中心: {
    desc: "弧形新月状建筑，社团活动与文化演出的主场地，内设报告厅常举办讲座与晚会。",
    descEn: "A crescent-shaped building — the main venue for club activities and cultural performances, with a lecture hall for talks and evening shows.",
    photo: "photos/activity.jpg",
  },
  工科大楼: {
    desc: "工科各系共用的教学实验楼群，多翼回字形平面围合出内院。（本栋造型为参数化演绎，欢迎提供实照校准）",
    descEn: "Teaching and laboratory complex shared by engineering departments, with multi-wing courtyards. (The current model is a parametric interpretation; photos for calibration are welcome.)",
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
    desc: "数理学科教学科研楼，2015 年竣工，获中国建筑工程鲁班奖，南北两区布置。",
    descEn: "Teaching-and-research building for the mathematical and physical sciences, completed in 2015 and awarded the Luban Award; arranged in north and south zones.",
    photo: "photos/likelou.jpg",
  },
  第一食堂: {
    desc: '松园与竹园之间的两层大食堂，2025 年整体装修改造。橙红坡顶大体量依卫星影像复原；屋顶脊线、天窗与入口门斗为估算细节。',
    descEn: 'A two-storey dining hall between Songyuan and Zhuyuan, fully refurbished in 2025. The orange-red pitched volume follows satellite imagery; ridge details, skylights and the entry canopy are estimated.',
  },
  第二食堂: {
    desc: '松园西侧的三层平顶食堂。白色框架立面与南向玻璃门厅依卫星影像与通用食堂形制复原，层高与机组为估算。',
    descEn: 'A three-storey flat-roofed canteen west of Songyuan. The white frame facade and south glass lobby follow satellite imagery; storey heights and plant rooms are estimated.',
  },
  第三食堂: {
    desc: '兰园以南的三层食堂，楼体随地块斜置。红橙平顶与深挑檐依卫星影像复原，层数来自 OSM。',
    descEn: 'A three-storey canteen south of Lanyuan, rotated with its block. The orange flat roof and deep eaves follow satellite imagery; storeys from OSM.',
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
    desc: '北区校园诊所长楼。暖色平顶与底层柱廊为推测（卫星证据中等）。',
    descEn: 'The long campus clinic in the north. Warm flat roof and ground-floor colonnade are inferred (moderate satellite evidence).',
  },
};
