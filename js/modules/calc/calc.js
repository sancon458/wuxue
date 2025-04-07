import * as pako from '../../../extern/pako_2.0.4_esm.js';

let skillData = null;
let skillAutoData = null;

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
    let count = 0;

    Object.values(passiveSkills).forEach(skill => {
        totalAtk += skill.atk || 0;
        totalDuration += (skill.preDuration || 0) + (skill.aftDuration || 0);
        count++;
    });

    const avgAtk = count > 0 ? (totalAtk / count).toFixed(2) : 0;
    const avgDuration = count > 0 ? (totalDuration / count).toFixed(2) : 0;

    return { avgAtk, avgDuration };
}

function calculatePanelAttack(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue) {
    const attackCoefficient = skillData.skills[skillId].atk; 
    const powerAttackCoefficient = skillData.skills[skillId].powerAtkRate; 
    // const panelAttack = (prepSkillLevel * 0.03 * attackCoefficient + maxNeili / 20 + 10 + Math.pow(characterExp, 0.4)) * (1 + 0.02 * effectiveArmStrength) + powerValue * powerAttackCoefficient * (1 + prepSkillLevel / 500) * (0.001 * effectiveArmStrength + 0.49);
    let panelAttack = (prepSkillLevel * 0.03 * attackCoefficient + maxNeili / 20 + 10 + Math.pow(characterExp, 0.4))
    panelAttack = panelAttack * (1 + 0.02 * effectiveArmStrength)
    panelAttack = panelAttack + powerValue * powerAttackCoefficient * (1 + prepSkillLevel / 500) * (0.001 * effectiveArmStrength + 0.49);
    return panelAttack;
}

function calculateAverageQixueDamage(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue, opponentDefense) {
    let { avgAtk, avgDuration } = calcPassive(skillId, skillAutoData);
    let damageRate = skillData.skills[skillId].damRate;
    let panelAttack = calculatePanelAttack(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue);
    let skillAttackAbility = 8 * (damageRate + (panelAttack * (1 + avgAtk) * damageRate) / 1000);
    let averageQixueDamage = skillAttackAbility * (1000 / (1000 + opponentDefense));
    averageQixueDamage = averageQixueDamage.toFixed(2);
    panelAttack = panelAttack.toFixed(2);
    
    return { averageQixueDamage, panelAttack, avgAtk, avgDuration };
}

function categorizeSkillsByMethod(skills) {
    const categorizedSkills = {};
    skills.forEach(skill => {
        if (!String(skill.methods).includes(',')) {
            return;
        }
        const methods = skill.methods.split(',').map(Number);
        methods.forEach(methodId => {
            const methodName = getMethodName(methodId);
            if (!categorizedSkills[methodName]) {
                categorizedSkills[methodName] = [];
            }
            categorizedSkills[methodName].push(skill);
        });
    });
    return categorizedSkills;
}

document.getElementById('calcForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const prepSkillLevel = parseFloat(document.getElementById('prepSkillLevel').value);
    const maxNeili = parseFloat(document.getElementById('maxNeili').value);
    const characterExp = parseFloat(document.getElementById('characterExp').value);
    const effectiveArmStrength = parseFloat(document.getElementById('effectiveArmStrength').value);
    const powerValue = parseFloat(document.getElementById('powerValue').value);
    const opponentDefense = parseFloat(document.getElementById('opponentDefense').value);

    let results = [];
    Object.keys(skillData.skills).forEach(skillId => {
        const passiveSkills = skillAutoData[skillId];
        if (passiveSkills) {
            let { averageQixueDamage, panelAttack, avgAtk, avgDuration } = calculateAverageQixueDamage(skillId, prepSkillLevel, maxNeili, characterExp, effectiveArmStrength, powerValue, opponentDefense);
            results.push({
                skillId: skillId,
                name: skillData.skills[skillId].name || skillId,
                methods: skillData.skills[skillId].methods,
                averageQixueDamage: parseFloat(averageQixueDamage),
                panelAttack: parseFloat(panelAttack),
                avgAtk: parseFloat(avgAtk),
                avgDuration: parseFloat(avgDuration)
            });
        }
    });

    // 按照 averageQixueDamage 降序排序
    results.sort((a, b) => b.averageQixueDamage - a.averageQixueDamage);

    const categorizedSkills = categorizeSkillsByMethod(results);

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

        categorizedSkills[methodName].forEach(result => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-item';
            skillElement.innerHTML = `<p>武学: ${result.name}, 平均气血伤害: ${result.averageQixueDamage}, 面板攻击: ${result.panelAttack}, 平均招式攻击系数: ${result.avgAtk}, 平均招式前后摇: ${result.avgDuration}(攻击一次消耗${(result.avgDuration/3).toFixed(2)}管黄条)</p>`;
            tabContent.appendChild(skillElement);
        });

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

init();