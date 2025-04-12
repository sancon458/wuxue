import * as pako from '../../../extern/pako_2.0.4_esm.js';

let skillData = null;
let skillAutoData = null;

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();
            const selectedValue = this.getAttribute('data-value');
            document.getElementById('dropdownMenuButton').textContent = this.textContent;
            document.getElementById('sortOrder').value = selectedValue;
        });
    });
});
// 从JSON文件加载数据
async function loadSkillData() {
    try {
        const response = await fetch('data/skill.json.gz');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const gzippedData = await response.arrayBuffer();
        const data = pako.inflate(gzippedData, { to: 'string' });
        skillData = JSON.parse(data);
        // 一刀流特殊处理
        skillData.skills.yidaoliu.weapontype = "jianfa1,jianfa2,jianfa3,jianfa4,jianfa5,daofa1,daofa2,daofa3,daofa4,daofa5";
        return skillData;
    } catch (error) {
        console.error('Error loading skill data:', error);
        document.getElementById('skillList').innerHTML = 
            '<div class="col-12"><div class="alert alert-danger">加载数据失败，请确保data/skill.json.gz文件存在且格式正确。</div></div>';
        throw error;
    }
}

async function loadSkillAutoData() {
    if (skillAutoData) return skillAutoData;
    try {
        console.log('Loading skillAuto.json.gz');
        const response = await fetch('data/skillAuto.json.gz');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const gzippedData = await response.arrayBuffer();
        const data = pako.inflate(gzippedData, { to: 'string' });
        skillAutoData = JSON.parse(data);
        return skillAutoData;
    } catch (error) {
        console.error('Error loading skill auto data:', error);
        return null;
    }
}

function calcPassive(skillId, skillAutoData) {
    const passiveSkills = skillAutoData[skillId];
    
    if (!passiveSkills) {
        return { avgAtk: 0, avgDuration: 0 };
    }

    let totalAtk = 0;
    let totalDuration = 0;
    let totalDam = 0;
    let totalZhaoHitRate = 0;
    let count = 0;

    Object.values(passiveSkills).forEach(skill => {
        totalAtk += skill.atk || 0;
        totalDam += skill.dam || 0;
        totalZhaoHitRate += skill.hitRate || 0;
        totalDuration += (skill.preDuration || 0) + (skill.aftDuration || 0);
        count++;
    });

    let avgAtk = count > 0 ? (totalAtk / count) : 0;
    let avgDuration = count > 0 ? (totalDuration / count) : 0;
    let avgDam = count > 0 ? (totalDam / count) : 0;
    let avgHitRate = count > 0 ? (totalZhaoHitRate / count) : 0;

    avgAtk = typeof avgAtk === 'string' ? parseFloat(avgAtk) : avgAtk;
    avgDuration = typeof avgDuration === 'string' ? parseFloat(avgDuration) : avgDuration;
    avgDam = typeof avgDam === 'string' ? parseFloat(avgDam) : avgDam;
    avgHitRate = typeof avgHitRate === 'string' ? parseFloat(avgHitRate) : avgHitRate;

    return { avgAtk, avgDuration, avgDam, avgHitRate};
}

function calculatePanelAttack(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue) {
    const attackCoefficient = skillData.skills[skillId].atk; 
    const powerAttackCoefficient = skillData.skills[skillId].powerAtkRate; 

    let panelAttack = (prepSkillLevel * 0.03 * attackCoefficient + maxNeili / 20 + 10 + Math.pow(characterExp, 0.4))
    panelAttack = panelAttack * (1 + 0.02 * effectiveArmStrength)
    panelAttack = panelAttack + powerValue * powerAttackCoefficient * (1 + prepSkillLevel / 500) * (0.001 * effectiveArmStrength + 0.49);
    
    panelAttack = typeof panelAttack === 'string' ? parseFloat(panelAttack) : panelAttack;
    return panelAttack;
}

function calculateAverageQixueDamage(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue, opponentDefense, opponentProtectDefense, currstr, currdex, currcon) {
    let { avgAtk, avgDuration, avgDam , avgHitRate} = calcPassive(skillId, skillAutoData);
    let damageRate = parseFloat(skillData.skills[skillId].damRate);
    let panelAttack = calculatePanelAttack(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue);
    let skillAttackAbility = 0;
    let finalPanelAttack = 0;
    let averageQixueDamage = 0;
    let averageQixueMaxDamage = 0;
    let atkSpeed = 0;
    let dps = 0;
    let dpsArr = [];
    let addTrueDam = 0;
    let dam = 0;
    let addSpeedRate = 0;
    let addPanelAtk = 0;
    let finalAtkFactor = 0;
    let weaponName  = 0;
    let SBWight = 0;
    
    if (skillData.skills[skillId].weapontype) {
        let weapontype = String(skillData.skills[skillId].weapontype).includes(',') 
                        ?skillData.skills[skillId].weapontype.split(',')
                        :[skillData.skills[skillId].weapontype]
        weapontype.forEach((weapontypeId) => {
            const weaponName = getWeapontype(weapontypeId);
            atkSpeed = 3 / avgDuration;
            const { addTrueDam, dam, addSpeedRate, addPanelAtk, finalAtkFactor, SBWight } = calSBAttr(weaponName, currstr, currdex, currcon, atkSpeed, effectiveArmStrength);
            
            // 计算神兵附加面板
            finalPanelAttack = panelAttack+addPanelAtk;
            // 计算气血上限伤害
            averageQixueMaxDamage = (dam+avgDam)/(1+opponentProtectDefense/100);
            // 重新计算平均气血伤害, 附加伤害直接加到气血伤害上
            skillAttackAbility = 8 * (damageRate + (finalPanelAttack * (1 + avgAtk) * damageRate) / 1000);
            skillAttackAbility = skillAttackAbility;
            averageQixueDamage = skillAttackAbility * (1000 / (1000 + opponentDefense));
            dps = (averageQixueMaxDamage+averageQixueDamage+addTrueDam) * (atkSpeed * (1 + addSpeedRate)) * (1 + finalAtkFactor);
        
            // 构建当前武器完整数据对象
            const currentDpsInfo = {
                panelAttack : parseFloat(panelAttack),
                avgAtk : parseFloat(avgAtk),
                avgDuration : parseFloat(avgDuration),
                avgDam : parseFloat(avgDam),
                avgHitRate : parseFloat(avgHitRate),
                weapontypeId,
                weaponName,
                SBWight : parseFloat(SBWight),
                addTrueDam : parseFloat(addTrueDam), // 确保数值类型
                dam : parseFloat(dam),
                addSpeedRate : parseFloat(addSpeedRate), // 确保数值类型
                addPanelAtk : parseFloat(addPanelAtk), // 确保数值类型
                finalAtkFactor : parseFloat(finalAtkFactor), // 确保数值类型
                finalPanelAttack: parseFloat(finalPanelAttack), // 确保数值类型
                averageQixueMaxDamage: parseFloat(averageQixueMaxDamage),
                averageQixueDamage : parseFloat(averageQixueDamage),
                atkSpeed : parseFloat(atkSpeed),
                dps : parseFloat(dps),
            };
            dpsArr.push(currentDpsInfo);
        
        });
    }
    else {
        skillAttackAbility = 8 * (damageRate + (panelAttack * (1 + avgAtk) * damageRate) / 1000);
        skillAttackAbility = skillAttackAbility;
        // 平均气血伤害
        averageQixueDamage = skillAttackAbility * (1000 / (1000 + opponentDefense));
        // 平均气血上限伤害
        averageQixueMaxDamage = (avgDam)/(1+opponentProtectDefense/100);
        atkSpeed = 3 / avgDuration;
        dps = (averageQixueMaxDamage+averageQixueDamage) * atkSpeed;
        addTrueDam = 0;
        dam = 0;
        addSpeedRate =0;
        addPanelAtk = 0;
        finalAtkFactor = 0;
        weaponName = '无';
        SBWight = 0;
        finalPanelAttack = panelAttack+addPanelAtk;
        // 构建当前武器完整数据对象
        const currentDpsInfo = {
            panelAttack : parseFloat(panelAttack),
            avgAtk : parseFloat(avgAtk),
            avgDuration : parseFloat(avgDuration),
            avgDam : parseFloat(avgDam),
            avgHitRate : parseFloat(avgHitRate),
            weapontypeId : '无',
            weaponName : '无',
            SBWight : parseFloat(SBWight),
            addTrueDam : parseFloat(addTrueDam), // 确保数值类型
            dam : parseFloat(dam),
            addSpeedRate : parseFloat(addSpeedRate), // 确保数值类型
            addPanelAtk : parseFloat(addPanelAtk), // 确保数值类型
            finalAtkFactor : parseFloat(finalAtkFactor), // 确保数值类型
            finalPanelAttack: parseFloat(finalPanelAttack), // 确保数值类型
            averageQixueMaxDamage: parseFloat(averageQixueMaxDamage),
            averageQixueDamage : parseFloat(averageQixueDamage),
            atkSpeed : parseFloat(atkSpeed),
            dps : parseFloat(dps),
        };
        dpsArr.push(currentDpsInfo);
    }

    if (dpsArr.length > 1) { dpsArr.sort((a, b) => b.dps - a.dps); };
    return dpsArr;
}
function calSBAttr(SBname, currstr, currdex, currcon, atkSpeed, effectiveArmStrength) {
    let addTrueDam = 0;
    let dam = 460;
    let addSpeedRate = 0;
    let addPanelAtk = 0;
    let CN=300;
    let finalAtkFactor = 0;

    // 有效臂力<=重量/2	-重量/100	-0.2
    // 重量/2<有效臂力<=重量	-重量/200	-0.15
    // 重量<有效臂力<=重量*2	-重量/100	-0.1
    // 2*重量<有效臂力<=5*重量	-重量/100	-0.05
    // 5*重量<有效臂力<=10*重量	0	0
    // 有效臂力>10*重量	重量/50	0.2
    // 有效臂力=先天臂力+后天臂力/2		

    let SBWight = getSBWeight(SBname);
    if (effectiveArmStrength > 10*SBWight) {
        addSpeedRate = 0.2;
    }
    else if (effectiveArmStrength > 5*SBWight) {
        addSpeedRate = 0;
    }
    else if (effectiveArmStrength > 2*SBWight) {
        addSpeedRate = -0.05;
    }
    else if (effectiveArmStrength > SBWight) {
        addSpeedRate = -0.1;
    }
    else if (effectiveArmStrength > SBWight/2) {
        addSpeedRate = -0.15;
    }
    else {
        addSpeedRate = -0.2;
    }

    // 次数 = 4秒*攻速
    // 触发期望 = 触发概率 * 次数
    // 期望 = 触发值 * 触发期望，最大不超过加速值本身

    switch(SBname) {
        case '长剑':
            addPanelAtk = parseFloat(currstr*9+7*CN+100);
            break;
        case '短剑':
            finalAtkFactor = Math.min(((4 * atkSpeed) * (1/3)) * 0.15, 0.15);
            break;
        case '软剑':
            addSpeedRate += parseFloat((currdex+10+CN*0.4)/1200);
            addSpeedRate = Math.min(((4 * atkSpeed) * 0.25) * addSpeedRate, addSpeedRate);
            break;
        case '重剑':
            dam += 223;
            break;
        case '刺剑':
            addTrueDam = parseFloat(10+CN*0.1+currstr*0.15+dam*0.5);
            break;
        case '长刀':
            dam += 276;
            addPanelAtk = parseFloat(CN*16+currstr*6+2000);
            break;
        case '短刀':
            addTrueDam = parseFloat(currstr*0.2+currdex*0.48+100+CN/5);
            break;
        case '弯刀':
            addTrueDam = parseFloat(currstr*0.35+currdex*0.4+75+CN/3);
            addPanelAtk = parseFloat(CN*9+currstr*3+1250);
            break;
        case '大环刀':
            break;
        case '双刃斧':
            addTrueDam = parseFloat(currstr*0.5+currdex*0.3+15+CN*0.9);
            break;
        case '长棍':
            dam += parseFloat(currstr*0.1+CN*1.1+5);
            addPanelAtk = parseFloat(CN*23+currstr*17+1250);
            break;
        case '长枪':
            dam += parseFloat(currstr*0.1+CN*1.1+5);
            break;
        case '三节棍':
            dam += parseFloat(currstr*0.1+CN*0.8+26);
            break;
        case '狼牙棒':
            break;
        case '战戟':
            addPanelAtk = parseFloat(CN*6+currstr*5+950);
            addTrueDam = parseFloat(currstr*0.35+currdex*0.32+75+CN/3);
            finalAtkFactor = Math.min(((4 * atkSpeed) * (1/3)) * 0.2, 0.2);
            break;
        case '长鞭':
            finalAtkFactor = Math.min(((4 * atkSpeed) * (1/3)) * 0.15, 0.15);
            break;
        case '软鞭':
            break;
        case '九节鞭':
            addPanelAtk = Math.floor(CN*14+currstr*5+2000);
            addTrueDam = parseFloat(currstr*0.35+currdex*0.32+72+CN*0.7);
            break;
        case '杆子鞭':
            addTrueDam = parseFloat(currstr*0.2+currdex*0.48+100+CN/5);
            break;
        case '链枷':
            break;
        case '锥形暗器':
            addTrueDam = parseFloat(135*0.53+100*0.15+80+CN*0.4)
            break;
        case '圆形暗器':
            dam += Math.floor(135*0.05+100*0.05+0.6*CN+10)
            break;
        case '针形暗器':
            break;
        case '双环':
            addSpeedRate += parseFloat((currdex+10+CN*0.4)/2400);
            addSpeedRate = Math.min(((4 * atkSpeed) * 0.25) * addSpeedRate, addSpeedRate);
            finalAtkFactor = Math.min(((4 * atkSpeed) * (1/3)) * 0.18, 0.18);
            break;
        case '对剑':
            addTrueDam = parseFloat(currstr*0.2+currdex*0.48+100+CN/5);
            break;
        case '双钩':
            dam += 113;
            addPanelAtk = Math.floor(currstr*19+14*CN+80);
            break;
        case '古琴':
            addSpeedRate += parseFloat((currdex+10+CN*0.4)/2400);
            addSpeedRate = Math.min(((4 * atkSpeed) * 0.25) * addSpeedRate, addSpeedRate);
            dam += Math.floor(currstr*0.1+CN*0.8+30);
            break;
        case '笛子':
            break;
        default:
            break;
    }
    addTrueDam = typeof addTrueDam === 'string' ? parseFloat(addTrueDam) : addTrueDam;
    dam = typeof dam === 'string' ? parseFloat(dam) : dam;
    addSpeedRate = typeof addSpeedRate === 'string' ? parseFloat(addSpeedRate) : addSpeedRate;
    addPanelAtk = typeof addPanelAtk === 'string' ? parseFloat(addPanelAtk) : addPanelAtk;
    finalAtkFactor = typeof finalAtkFactor === 'string' ? parseFloat(finalAtkFactor) : finalAtkFactor;
    SBWight = typeof SBWight === 'string' ? parseFloat(SBWight) : SBWight;
    return { addTrueDam, dam, addSpeedRate, addPanelAtk, finalAtkFactor, SBWight};
}

function categorizeSkillsByMethod(skills) {
    const categorizedSkills = {};
    skills.forEach(skill => {
        const methods = String(skill.methods).includes(',') 
                        ? skill.methods.split(',').map(Number) 
                        : [Number(skill.methods)];
        methods.forEach(methodId => {
            const methodName = getMethodName(methodId);
            if (methodName === '招架') {
                return;
            }
            if (!categorizedSkills[methodName]) {
                categorizedSkills[methodName] = [];
            }
            categorizedSkills[methodName].push(skill);
        });
    });
    return categorizedSkills;
}

function calHitRate(skillId, dodgeValue, parryLv, parryFactor, enemyExp, prepSkillLevel, characterExp, effectiveArmStrength) {
    let { avgAtk, avgDuration, avgDam , avgHitRate} = calcPassive(skillId, skillAutoData);
    let hitRate = 0;
    let dodgeRate = 0;
    let parryRate = 0; 
    let parryValue = 0;
    let battleHitRate = 0;
    hitRate = (prepSkillLevel*15*skillData.skills[skillId].hitRate/100 + 1000 + 0.5*Math.pow(characterExp, 0.5)) * (1+effectiveArmStrength*0.02);
    hitRate = hitRate * (1+avgHitRate) * (2 / (1+Math.pow(3, (enemyExp-characterExp)/(enemyExp+characterExp))));
    dodgeRate = Math.floor(dodgeValue*0.7) / (dodgeValue*0.7 +hitRate) 
    parryValue = (parryLv*15*parryFactor)/200
    parryRate = Math.floor(parryValue*1.2) / (parryValue*1.2 +hitRate*0.85)
    battleHitRate = (1-dodgeRate)*(1-parryRate)

    battleHitRate = typeof battleHitRate === 'string' ? parseFloat(battleHitRate) : battleHitRate;
    avgHitRate = typeof avgHitRate === 'string' ? parseFloat(avgHitRate) : avgHitRate;
    let hitData = { battleHitRate, avgHitRate };
    return hitData;
}

document.getElementById('calcForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const prepSkillLevel = parseFloat(document.getElementById('prepSkillLevel').value) || 0;
    const maxNeili = parseFloat(document.getElementById('maxNeili').value) || 0;
    const characterExp = parseFloat(document.getElementById('characterExp').value) || 0;
    const powerValue = parseFloat(document.getElementById('powerValue').value) || 0;
    const sortOrder = document.getElementById('sortOrder').value;
    const currstr = parseFloat(document.getElementById('armStrength').value) || 0;
    const currdex = parseFloat(document.getElementById('currDex').value) || 0;    
    const currcon = parseFloat(document.getElementById('currCon').value) || 0;
    const effectiveArmStrength = parseFloat(document.getElementById('effectiveArmStrength').value) || 0;
    const effectivedex = parseFloat(document.getElementById('effectiveDex').value) || 0;    
    const effectivecon = parseFloat(document.getElementById('effectiveCon').value) || 0;
    const protect = parseFloat(document.getElementById('protect').value) || 0;
    const opponentDefense = parseFloat(document.getElementById('opponentDefense').value) || 0;
    const dodgeValue = parseFloat(document.getElementById('dodgeValue').value) || 0;
    const parryLv = parseFloat(document.getElementById('parryLv').value) || 0;
    const parryFactor = parseFloat(document.getElementById('parryFactor').value) || 0;
    const enemyExp = parseFloat(document.getElementById('enemyExp').value) || 0;

    let results = [];
    Object.keys(skillData.skills).forEach(skillId => {
        const passiveSkills = skillAutoData[skillId];
        if (passiveSkills) {
            let atkData = calculateAverageQixueDamage(
                skillId, prepSkillLevel, 
                maxNeili,  characterExp, 
                effectiveArmStrength, powerValue, 
                opponentDefense,  protect, currstr, 
                currdex,  currcon
            );
            
            let hitData = calHitRate(
                skillId, dodgeValue, 
                parryLv, parryFactor, 
                enemyExp, prepSkillLevel, 
                characterExp, effectiveArmStrength
            );

            atkData[0].dps = atkData[0].dps * hitData.battleHitRate;
            if (atkData[1]) {  atkData[1].dps = atkData[1].dps * hitData.battleHitRate;};
            
            // NaN处理，只需考虑排序的两个变量
            // 使用Number.isNaN() 而不是isNaN()
            atkData[0].averageQixueDamage = Number.isNaN(atkData[0].averageQixueDamage) ? 0 : atkData[0].averageQixueDamage;
            atkData[0].dps = Number.isNaN(atkData[0].dps) ? 0 : atkData[0].dps;
            
            results.push({
                skillId: skillId,
                name: skillData.skills[skillId].name 
                    ? `${skillData.skills[skillId].name} ${skillId.match(/\d+/)?.[0] || ''}`
                    : `${skillId}${skillId.match(/\d+/)?.[0] || ''}`,
                methods: skillData.skills[skillId].methods,
                averageQixueDamage: parseFloat(atkData[0].averageQixueDamage.toFixed(3)),
                averageQixueMaxDamage : parseFloat(atkData[0].averageQixueMaxDamage.toFixed(3)),
                panelAttack: parseFloat(atkData[0].panelAttack.toFixed(3)),
                avgAtk: parseFloat(atkData[0].avgAtk.toFixed(3)),
                avgDuration: parseFloat(atkData[0].avgDuration.toFixed(3)),
                avgDam : parseFloat(atkData[0].avgDam.toFixed(3)),
                avgHitRate: parseFloat(hitData.avgHitRate.toFixed(3)),
                atkSpeed: parseFloat(atkData[0].atkSpeed.toFixed(3)),
                battleHitRate: parseFloat(hitData.battleHitRate.toFixed(3)),
                dps: parseFloat(atkData[0].dps.toFixed(3)),
                addTrueDam: parseFloat(atkData[0].addTrueDam.toFixed(3)),
                dam: parseFloat(atkData[0].dam.toFixed(3)),
                addSpeedRate: parseFloat(atkData[0].addSpeedRate.toFixed(3)),
                addPanelAtk: parseFloat(atkData[0].addPanelAtk.toFixed(3)),
                finalAtkFactor: parseFloat(atkData[0].finalAtkFactor.toFixed(3)),
                weaponName: atkData[0].weaponName,
                SBWight: parseFloat(atkData[0].SBWight.toFixed(3)),
                secSDBInfo : atkData[1] || '',
            });
        }
    });

    let categorizedSkills = categorizeSkillsByMethod(results);
    categorizedSkills['全部'] = [];
    categorizedSkills['全部'].push(...results);
    
    // 根据选择的排序方式进行排序
    Object.keys(categorizedSkills).forEach(methodName => {
        if (sortOrder === 'qixueDamage') {
            categorizedSkills[methodName].sort((a, b) => b.averageQixueDamage - a.averageQixueDamage);
        } else if (sortOrder === 'dps') {
            categorizedSkills[methodName].sort((a, b) => b.dps - a.dps);
        }
    });
    

    // 创建标签页和内容
    const tabContainer = document.getElementById('tabContainer');
    const tabContentContainer = document.getElementById('tabContentContainer');
    tabContainer.innerHTML = ''; // 清空现有标签页
    tabContentContainer.innerHTML = ''; // 清空现有内容

    Object.keys(categorizedSkills).forEach((methodName, index) => {
        // 创建标签页
        const tab = document.createElement('li');
        tab.className = 'nav-item';
        const tabLink = document.createElement('a');
        tabLink.className = `nav-link ${index === 0 ? 'active' : ''}`;
        tabLink.id = `${methodName}-tab`;
        tabLink.setAttribute('data-bs-toggle', 'tab');
        tabLink.setAttribute('href', `#${methodName}`);
        tabLink.setAttribute('role', 'tab');
        tabLink.setAttribute('aria-controls', methodName);
        tabLink.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        tabLink.textContent = methodName;
        tab.appendChild(tabLink);
        tabContainer.appendChild(tab);

        // 创建标签页内容
        const tabContent = document.createElement('div');
        tabContent.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        tabContent.id = methodName;
        tabContent.setAttribute('role', 'tabpanel');
        tabContent.setAttribute('aria-labelledby', `${methodName}-tab`);

        // 创建表格
        const table = document.createElement('table');
        table.className = 'table table-striped';
    

        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = [
            '排位',
            '武学',
            '气血攻击',
            '气血上限攻击',
            '面板攻击',
            '招均攻击系数',
            '前后摇',
            '招均伤害力',
            '招均命中率',
            '攻速',
            '命中率',
            '秒伤',
            '神兵',
            '次选参考'
        ];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 计数器
        let count = 0;

        // 创建表格主体
        const tbody = document.createElement('tbody');
        categorizedSkills[methodName].forEach(result => {
            count++;
            const row = document.createElement('tr');
            
            // '排位',
            const ranlCell = document.createElement('td');
            ranlCell.textContent = count;
            row.appendChild(ranlCell);
            // '武学',
            const nameCell = document.createElement('td');
            nameCell.textContent = result.name;
            row.appendChild(nameCell);
            // '平均气血',
            const averageQixueDamageCell = document.createElement('td');
            averageQixueDamageCell.textContent = result.averageQixueDamage;
            row.appendChild(averageQixueDamageCell);
            // '气血上限',
            const averageQixueMaxDamageCell = document.createElement('td');
            averageQixueMaxDamageCell.textContent = result.averageQixueMaxDamage;
            row.appendChild(averageQixueMaxDamageCell);
            // '面板攻击',
            const panelAttackCell = document.createElement('td');
            panelAttackCell.textContent = result.panelAttack;
            row.appendChild(panelAttackCell);
            // '均攻击系数',
            const avgAtkCell = document.createElement('td');
            avgAtkCell.textContent = result.avgAtk;
            row.appendChild(avgAtkCell);
            // '前后摇',
            const avgDurationCell = document.createElement('td');
            avgDurationCell.textContent = result.avgDuration;
            row.appendChild(avgDurationCell);
            // '均伤害力',
            const avgDamCell = document.createElement('td');
            avgDamCell.textContent = result.avgDam;
            row.appendChild(avgDamCell);
            // '均命中率',
            const avgHitRateCell = document.createElement('td');
            avgHitRateCell.textContent = result.avgHitRate;
            row.appendChild(avgHitRateCell);
            // '攻速',
            const atkSpeedCell = document.createElement('td');
            atkSpeedCell.textContent =result.atkSpeed;
            row.appendChild(atkSpeedCell);
            // 命中率
            const battleHitRateCell = document.createElement('td');
            battleHitRateCell.textContent = result.battleHitRate;
            row.appendChild(battleHitRateCell);
            // '秒伤',
            const dpsCell = document.createElement('td');
            dpsCell.textContent = result.dps;
            row.appendChild(dpsCell);
            
            // '神兵'
            const sbInfoCell = document.createElement('td');

            // 初始化一个数组来存储需要显示的信息
            const sbInfo = [];

            // 检查每个值是否为0，如果不为0则添加到数组中
            if (result.weaponName !== '无') sbInfo.push(`神兵名 ${result.weaponName}`);
            if (result.SBWight !== 0) sbInfo.push(`神兵重 ${result.SBWight}`);
            if (result.addTrueDam !== 0) sbInfo.push(`附伤 ${result.addTrueDam}`);
            if (result.dam !== 0) sbInfo.push(`伤害力 ${result.dam }`);
            if (result.addPanelAtk !== 0) sbInfo.push(`面板攻击 ${result.addPanelAtk}`);
            if (result.addSpeedRate !== 0) sbInfo.push(`期望加速 ${result.addSpeedRate}`);
            if (result.finalAtkFactor !== 0) sbInfo.push(`折算加攻 ${result.finalAtkFactor}`);
            // 将数组中的信息用换行符连接成一个字符串
            sbInfoCell.textContent = sbInfo.join('\n');
            sbInfoCell.style.whiteSpace = 'pre-line'; // 添加这一行
            // 将新的 td 添加到 row 中
            row.appendChild(sbInfoCell);

            if (result.secSDBInfo !== '') {
                const secSbInfoCell = document.createElement('td');
                // 初始化一个数组来存储需要显示的信息
                const secSbInfo = [];

                // 检查每个值是否为0，如果不为0则添加到数组中
                if (result.secSDBInfo.weaponName !== '无') secSbInfo.push(`神兵名 ${result.secSDBInfo.weaponName}`);
                if (result.secSDBInfo.SBWight !== 0) secSbInfo.push(`神兵重 ${result.secSDBInfo.SBWight}`);
                if (result.secSDBInfo.addTrueDam !== 0) secSbInfo.push(`附伤 ${result.secSDBInfo.addTrueDam}`);
                if (result.secSDBInfo.dam !== 0) secSbInfo.push(`伤害力 ${result.secSDBInfo.dam }`);
                if (result.secSDBInfo.addPanelAtk !== 0) secSbInfo.push(`面板攻击 ${result.secSDBInfo.addPanelAtk}`);
                if (result.secSDBInfo.addSpeedRate !== 0) secSbInfo.push(`期望加速 ${result.secSDBInfo.addSpeedRate}`);
                if (result.secSDBInfo.finalAtkFactor !== 0) secSbInfo.push(`折算加攻 ${result.secSDBInfo.finalAtkFactor}`);
                if (result.secSDBInfo.dps !== 0) secSbInfo.push(`秒伤 ${parseFloat(result.secSDBInfo.dps.toFixed(3))}`);
                // 将数组中的信息用换行符连接成一个字符串
                secSbInfoCell.textContent = secSbInfo.join('\n');
                secSbInfoCell.style.whiteSpace = 'pre-line'; // 添加这一行
                // 将新的 td 添加到 row 中
                row.appendChild(secSbInfoCell);
            };
            // 将 row 添加到 tbody 中
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        tabContent.appendChild(table);
        tabContentContainer.appendChild(tabContent);
    });
});

async function init() {
    try {
        // 加载技能数据
        skillData = await loadSkillData();
        
        // 加载被动技能数据
        skillAutoData = await loadSkillAutoData();

        // 添加表单提交事件监听器
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

function getWeapontype(weapontypeId) {
    const weapontype = {
        "jianfa1": "长剑",
        "jianfa2": "短剑",
        "jianfa3": "软剑",
        "jianfa4": "重剑",
        "jianfa5": "刺剑",
        "daofa1": "长刀",
        "daofa2": "短刀",
        "daofa3": "弯刀",
        "daofa4": "大环刀",
        "daofa5": "双刃斧",
        "gunfa1": "长棍",
        "gunfa2": "长枪",
        "gunfa3": "三节棍",
        "gunfa4": "狼牙棒",
        "gunfa5": "战戟",
        "bianfa1": "长鞭",
        "bianfa2": "软鞭",
        "bianfa3": "九节鞭",
        "bianfa4": "杆子鞭",
        "bianfa5": "链枷",
        "anqi1": "锥形暗器",
        "anqi2": "圆形暗器",
        "anqi3": "针形暗器",
        "shuangchi1": "双环",
        "shuangchi2": "对剑",
        "shuangchi3": "双钩",
        "qinfa1" : "古琴",
        "qinfa2" : "笛子"
    };
    return weapontype[weapontypeId] || weapontypeId;
}
function getMethodName(methodId) {
    const methodNames = {
        "1": "拳脚",
        "2": "内功",
        "3": "轻功",
        "4": "招架",
        "5": "剑法",
        "6": "刀法",
        "7": "棍法",
        "8": "暗器",
        "9": "鞭法",
        "10": "双持",
        "11": "乐器"
    };
    return methodNames[methodId] || methodId;
}

function getSBWeight(SBname) {
    const names = {
        "长剑": 21,
        "短剑": 15,
        "软剑": 15,
        "重剑": 21,
        "刺剑": 15,
        "长刀": 21,
        "短刀": 15,
        "弯刀": 20,
        "大环刀": 45,
        "双刃斧": 22,
        "长棍": 46,
        "长枪": 45,
        "三节棍": 21,
        "狼牙棒": 60,
        "战戟": 46,
        "长鞭": 20,
        "软鞭": 12,
        "九节鞭": 21,
        "杆子鞭": 21,
        "链枷": 45,
        "锥形暗器": 15,
        "圆形暗器": 15,
        "针形暗器": 15,
        "双环": 21,
        "对剑": 21,
        "双钩": 21,
        "古琴": 21,
        "笛子": 21
    };
    return names[SBname] || 9999; // 默认值为9999
}

init();