// 数据加载模块
export let skillData = {
    "正气需求": [],
    "skills": {}
};
export let activeSkillData = null;
export let skillAutoData = null;
export let skillRelationData = null;

// 从JSON文件加载数据
export async function loadSkillData() {
    try {
        const response = await fetch('data/skill.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        skillData = await response.json();
        return skillData;
    } catch (error) {
        console.error('Error loading skill data:', error);
        document.getElementById('skillList').innerHTML = 
            '<div class="col-12"><div class="alert alert-danger">加载数据失败，请确保data/skill.json文件存在且格式正确。</div></div>';
        throw error;
    }
}

// 加载主动技能数据
export async function loadActiveSkillData() {
    if (activeSkillData) return activeSkillData;
    try {
        console.log('Loading ActiveZhao.json');
        const response = await fetch('data/activeZhao.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        activeSkillData = data;
        return data;
    } catch (error) {
        console.error('Error loading active skill data:', error);
        return null;
    }
}

// 加载被动技能数据
export async function loadSkillAutoData() {
    if (skillAutoData) return skillAutoData;
    try {
        console.log('Loading skillAuto.json');
        const response = await fetch('data/skillAuto.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        skillAutoData = data;
        return data;
    } catch (error) {
        console.error('Error loading skill auto data:', error);
        return null;
    }
}

// 获取唯一的分类值
export function getUniqueValues(skills, key) {
    const values = new Set();
    Object.values(skills).forEach(skill => {
        if (skill[key]) {
            if (Array.isArray(skill[key]) || (typeof skill[key] === 'string' && skill[key].includes(','))) {
                const arrayValues = Array.isArray(skill[key]) ? skill[key] : skill[key].split(',');
                arrayValues.forEach(v => values.add(v.trim()));
            } else {
                values.add(skill[key]);
            }
        }
    });
    return Array.from(values).filter(v => v);
}

// 获取武学类型名称
export function getMethodName(methodId) {
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

// 查找关联的主动技能
export function findActiveSkills(skillId, activeSkillData) {
    if (!activeSkillData || !activeSkillData.skillRelation) return [];

    const relatedSkillGroups = [];
    
    for (const [activeSkillId, relation] of Object.entries(activeSkillData.skillRelation)) {
        if (relation.skillId === skillId) {
            const baseSkillId = relation.id;
            const skills = [];
            const baseSkill = activeSkillData.ActiveZhao[baseSkillId];
            
            if (!baseSkill) continue;
            
            for (let i = 1; i <= 11; i++) {
                const currentId = i === 1 ? baseSkillId : `${baseSkillId}${i}`;
                if (activeSkillData.ActiveZhao[currentId]) {
                    skills.push({
                        id: currentId,
                        level: i,
                        data: activeSkillData.ActiveZhao[currentId]
                    });
                }
            }
            
            relatedSkillGroups.push({
                skillId: baseSkillId,
                baseSkill: baseSkill,
                allSkills: skills
            });
        }
    }
    
    return relatedSkillGroups;
}