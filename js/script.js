// 初始化数据结构
let skillData = {
    "正气需求": [],
    "skills": {}
};
let activeSkillData = null;
let skillRelationData = null;

// 从JSON文件加载数据
async function loadSkillData() {
    try {
        const response = await fetch('data/skill.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        skillData = await response.json();
        initializePage();
    } catch (error) {
        console.error('Error loading skill data:', error);
        document.getElementById('skillList').innerHTML = 
            '<div class="col-12"><div class="alert alert-danger">加载数据失败，请确保data/skill.json文件存在且格式正确。</div></div>';
    }
}

// 加载主动技能数据
async function loadActiveSkillData() {
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

// 初始化过滤器状态
let activeFilters = {
    family: new Set()
};

// 获取唯一的分类值
function getUniqueValues(skills, key) {
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

// 创建过滤器标签
function createFilterBadges(containerId, values, filterType) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    values.sort().forEach(value => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary filter-badge';
        badge.textContent = value;
        badge.onclick = () => toggleFilter(badge, value, filterType);
        container.appendChild(badge);
    });
}

// 清除过滤器
function clearFilters(filterType) {
    activeFilters[filterType].clear();
    
    // 重置过滤器UI
    const containerId = filterType === 'family' ? 'familyFilters' : 'methodFilters';
    const badges = document.querySelectorAll(`#${containerId} .filter-badge`);
    badges.forEach(badge => badge.classList.remove('active'));
    
    updateSkillList();
}

// 切换过滤器状态
function toggleFilter(badge, value, filterType) {
    if (activeFilters[filterType].has(value)) {
        activeFilters[filterType].delete(value);
        badge.classList.remove('active');
    } else {
        activeFilters[filterType].add(value);
        badge.classList.add('active');
    }
    updateSkillList();
}

// 检查技能是否匹配过滤条件
function matchesFilters(skill) {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    // 搜索匹配
    const searchMatch = !searchText || 
        Object.entries(skill).some(([key, value]) => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(searchText);
        });

    // 门派过滤匹配
    const familyMatch = activeFilters.family.size === 0 || 
        (skill.familyList && activeFilters.family.has(skill.familyList));

    return searchMatch && familyMatch;
}

// 更新统计信息
function updateStats(filteredCount, totalCount) {
    const statsInfo = document.getElementById('statsInfo');
    statsInfo.textContent = `显示 ${filteredCount} 个技能（共 ${totalCount} 个）`;
}

// 获取技能类型名称
function getMethodName(methodId) {
    const methodNames = {
        "1": "拳脚",
        "2": "内功",
        "3": "轻功",
        "4": "招架",
        "5": "剑法",
        "6": "刀法",
        "7": "棍法",
        "8": "暗器"
    };
    return methodNames[methodId] || methodId;
}

// 查找关联的主动技能
function findActiveSkills(skillId, activeSkillData) {
    if (!activeSkillData || !activeSkillData.skillRelation) return [];

    // 在skillRelation中查找与当前技能相关的所有映射
    const relatedSkillGroups = [];
    
    // 遍历所有技能关系，找出所有与当前武学相关的主动技能
    for (const [activeSkillId, relation] of Object.entries(activeSkillData.skillRelation)) {
        if (relation.skillId === skillId) {
            // 找到一个映射
            const baseSkillId = relation.id;
            const skills = [];
            const baseSkill = activeSkillData.ActiveZhao[baseSkillId];
            
            if (!baseSkill) continue; // 跳过没有基础技能的映射
            
            // 收集所有重数的技能
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
            
            // 添加到结果集
            relatedSkillGroups.push({
                skillId: baseSkillId,
                baseSkill: baseSkill,
                allSkills: skills
            });
        }
    }
    
    return relatedSkillGroups;
}

// 模态窗口管理
const modalManager = {
    openModals: [], // 存储打开的模态窗口
    baseZIndex: 1050, // 基础z-index值

    // 打开新的模态窗口
    open: function(modal, element) {
        // 先将窗口添加到堆栈，确保zIndex计算正确
        const zIndex = this.baseZIndex + (this.openModals.length * 20);
        const modalInfo = {
            modal: modal,
            element: element,
            zIndex: zIndex
        };
        this.openModals.push(modalInfo);

        // 移除其他窗口的top-modal类
        this.openModals.forEach(m => {
            if (m.element !== element) {
                m.element.classList.remove('top-modal');
            }
        });

        // 设置当前窗口样式
        element.style.zIndex = zIndex;
        element.classList.add('top-modal');

        // 显示模态窗口
        modal.show();

        // 处理backdrop
        requestAnimationFrame(() => {
            const backdrop = document.querySelector('.modal-backdrop:last-child');
            if (backdrop) {
                backdrop.style.zIndex = zIndex - 10;
                backdrop.setAttribute('data-modal-backdrop', element.id);
            }
        });
    },

    // 关闭最上层的模态窗口
    close: function(element) {
        const index = this.openModals.findIndex(m => m.element === element);
        if (index !== -1) {
            // 移除当前窗口
            this.openModals.splice(index, 1);
            element.classList.remove('top-modal');
            
            // 移除对应的backdrop
            const backdrop = document.querySelector(`[data-modal-backdrop="${element.id}"]`);
            if (backdrop) {
                backdrop.remove();
            }

            // 如果还有其他窗口，将最上层窗口设置为可交互
            if (this.openModals.length > 0) {
                const topModal = this.openModals[this.openModals.length - 1];
                topModal.element.classList.add('top-modal');
                // 确保最上层窗口的z-index正确
                topModal.element.style.zIndex = topModal.zIndex;
                const topBackdrop = document.querySelector(`[data-modal-backdrop="${topModal.element.id}"]`);
                if (topBackdrop) {
                    topBackdrop.style.zIndex = topModal.zIndex - 10;
                }
            }
        }
    }
};

let effectModal = null;
let jsonModal = null;

// 初始化模态窗口
function initModals() {
    // 初始化模态窗口实例
    const effectElement = document.getElementById('effectModal');
    const jsonElement = document.getElementById('jsonModal');
    
    effectModal = new bootstrap.Modal(effectElement);
    jsonModal = new bootstrap.Modal(jsonElement);

    // 为模态窗口添加事件监听
    [effectElement, jsonElement].forEach(element => {
        // 关闭事件监听
        element.addEventListener('hidden.bs.modal', function() {
            modalManager.close(this);
        });

        // 设置初始z-index
        element.style.zIndex = modalManager.baseZIndex;
    });
}

// 解析effects字符串，返回效果ID数组
function parseEffects(effectsStr) {
    if (!effectsStr) return [];
    const effects = [];
    const regex = /\{"([^"]+)"/g;
    let match;
    while ((match = regex.exec(effectsStr)) !== null) {
        effects.push(match[1]);
    }
    return effects;
}

// 创建效果链接
function createEffectLinks(effectsStr) {
    if (!effectsStr) return effectsStr;
    const effectIds = parseEffects(effectsStr);
    let result = effectsStr;
    effectIds.forEach(id => {
        result = result.replace(
            `"${id}"`,
            `<span class="effect-link" data-effect-id="${id}" style="color: #007bff; text-decoration: underline; cursor: pointer;">"${id}"</span>`
        );
    });
    return result;
}

// 检查字符串是否可能是效果ID
function isPotentialEffectId(str) {
    // 效果ID通常是大写字母和数字的组合
    return typeof str === 'string' && /^[A-Z0-9]+$/.test(str) && str.length >= 2;
}

// 递归处理JSON对象中的效果ID
function processEffectIds(obj, currentId, processedIds = new Set()) {
    if (!obj) return obj;
    
    // 防止无限递归
    if (processedIds.has(currentId)) return obj;
    processedIds.add(currentId);
    
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('arg') && isPotentialEffectId(value) && value !== currentId) {
            // 对于arg1, arg2, arg3等字段中的潜在效果ID，创建可点击链接
            result[key] = `<span class="effect-link json-effect-link" data-effect-id="${value}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${value}</span>`;
        } else if (typeof value === 'object' && value !== null) {
            // 递归处理嵌套对象
            result[key] = processEffectIds(value, currentId, new Set(processedIds));
        } else {
            result[key] = value;
        }
    }
    
    return result;
}

// 将对象转换为带有效果链接的HTML
function jsonToHtmlWithEffectLinks(obj, currentId) {
    const processed = processEffectIds(obj, currentId);
    return JSON.stringify(processed, null, 2)
        .replace(/\\"/g, '"') // 移除转义的引号
        .replace(/"<span/g, '<span') // 移除span标签前的引号
        .replace(/<\/span>"/g, '</span>'); // 移除span标签后的引号
}

// 显示效果详情
function showEffectDetails(effectId, activeSkillData) {
    if (!activeSkillData?.Effect?.[effectId]) {
        console.log('Effect not found:', effectId);
        return;
    }

    try {
        const effectData = activeSkillData.Effect[effectId];
        const modalElement = document.getElementById('effectModal');
        document.getElementById('effectModalLabel').textContent = `效果详情: ${effectId}`;
        
        // 使用带有效果链接的HTML替代纯文本
        const contentElement = document.getElementById('effectContent');
        contentElement.innerHTML = jsonToHtmlWithEffectLinks(effectData, effectId);
        
        // 为新生成的效果链接添加点击事件
        contentElement.querySelectorAll('.json-effect-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const nestedEffectId = e.target.getAttribute('data-effect-id');
                showEffectDetails(nestedEffectId, activeSkillData);
            });
        });
        
        modalManager.open(effectModal, modalElement);
    } catch (error) {
        console.error('Error showing effect details:', error);
    }
}

// 找出对象之间的差异
function findDifferences(obj1, obj2) {
    const differences = {};
    for (const key in obj1) {
        if (typeof obj1[key] === 'object' && obj1[key] !== null) {
            continue; // 跳过嵌套对象
        }
        if (obj1[key] !== obj2[key]) {
            differences[key] = obj2[key];
        }
    }
    return differences;
}

// 显示主动技能信息
function showActiveSkills(skillId, activeSkillData) {
    const container = document.getElementById('activeSkillsList');
    const skillGroups = findActiveSkills(skillId, activeSkillData);
    
    if (skillGroups.length === 0) {
        container.innerHTML = '<div class="alert alert-info">该武学没有关联的主动技能。</div>';
        return;
    }

    let html = '';
    
    // 遍历每一个关联的主动技能组
    skillGroups.forEach((group, groupIndex) => {
        const {skillId, baseSkill, allSkills} = group;
        
        // 添加分隔线（除了第一个技能组）
        if (groupIndex > 0) {
            html += '<hr class="my-4">';
        }
        
        // 显示技能名称作为标题
        html += `
        <div class="mb-3">
            <h4 class="text-primary">${baseSkill.name || skillId}</h4>
        </div>`;
        
        // 显示基础技能的完整JSON数据
        html += `
        <div class="mb-4">
            <h5>技能基础数据</h5>
            <pre style="max-height: 200px; overflow-y: auto;">${JSON.stringify(baseSkill, null, 2)}</pre>
        </div>`;

        // 如果有多个重数，显示差异
        if (allSkills.length > 1) {
            html += `
            <div>
                <h5>各重数差异</h5>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>技能效果</th>
                                <th>${baseSkill.desc}</th>
                            </tr>
                            <tr>
                                <th>重数</th>
                                <th>差异属性</th>
                            </tr>
                        </thead>
                        <tbody>`;

            allSkills.forEach((skill, index) => {
                // if (index === 0) return; // 跳过第一重
                const differences = findDifferences(baseSkill, skill.data);
                const diffText = Object.entries(differences)
                    .map(([key, value]) => {
                        if (key === 'effects') {
                            return `${key}: ${createEffectLinks(value)}`;
                        }
                        return `${key}: ${value}`;
                    })
                    .join('<br>');
                
                if (diffText) {
                    html += `
                    <tr>
                        <td>第${skill.level}重
                            
                        </td>
                        <td>${diffText}</td>
                    </tr>`;
                }
            });

            html += `
                        </tbody>
                    </table>
                </div>
            </div>`;
        }
    });
    
    container.innerHTML = html;

    // 为效果链接添加点击事件
    // 使用事件委托来处理效果链接的点击
    container.addEventListener('click', (e) => {
        const link = e.target.closest('.effect-link');
        if (link) {
            const effectId = link.getAttribute('data-effect-id');
            showEffectDetails(effectId, activeSkillData);
        }
    });
}
// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有Modal
    initModals();
});
function updateSkillList() {
    const container = document.getElementById('skillList');
    container.innerHTML = '';
    
    let filteredCount = 0;
    const totalCount = Object.keys(skillData.skills).length;
    
    Object.entries(skillData.skills).forEach(([id, skill]) => {
        if (typeof skill === 'object' && skill !== null && matchesFilters(skill)) {
            filteredCount++;
            const col = document.createElement('div');
            col.className = 'col-md-4 col-lg-3';
            
            const card = document.createElement('div');
            card.className = 'card h-100';
            card.style.cursor = 'pointer';
            
            // 添加点击事件显示JSON数据和主动技能
            card.onclick = async () => {
                const modal = new bootstrap.Modal(document.getElementById('jsonModal'));
                const jsonContent = document.getElementById('jsonContent');
                jsonContent.textContent = JSON.stringify(skill, null, 2);
                document.getElementById('jsonModalLabel').textContent = `${skill.name || id} - 技能详情`;
                
                // 加载并显示主动技能数据
                try {
                    console.log('Loading active skill data for skill:', id);
                    const activeSkillData = await loadActiveSkillData();
                    console.log('Loaded activeSkillData:', activeSkillData ? 'success' : 'null');
                    showActiveSkills(id, activeSkillData);
                } catch (error) {
                    console.error('Error loading active skill data:', error);
                    document.getElementById('activeSkillsList').innerHTML = 
                        '<div class="alert alert-danger">加载主动技能数据时出错</div>';
                }
                
                modal.show();
            };
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            cardHeader.textContent = skill.name || id;
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            let content = '';
            
            // 添加描述（限制长度）
            if (skill.dsc) {
                const shortDesc = skill.dsc.replace(/HIW|NOR/g, '').split('\\n')[0];
                content += `<p class="skill-description" style="max-height: 3.6em; overflow: hidden;">${shortDesc}</p>`;
            }
            
            // 添加门派信息
            if (skill.familyList) {
                content += `<p><strong>门派：</strong><span class="badge bg-info">${skill.familyList}</span></p>`;
            }
            
            // 添加技能类型
            if (skill.methods) {
                content += '<p><strong>技能类型：</strong>';
                const methodArray = typeof skill.methods === 'string' 
                    ? skill.methods.split(',') 
                    : [String(skill.methods)];
                    
                methodArray.forEach(method => {
                    const methodName = getMethodName(method.trim());
                    content += `<span class="badge bg-success">${methodName}</span> `;
                });
                content += '</p>';
            }
            
            // 添加其他属性
            content += '<div class="mt-3">';
            
            // 武学等级
            // if (skill.wxlevel) {
            //     content += `
            //     <div class="attribute-row">
            //         <span class="attribute-label">武学等级：</span>
            //         <span class="attribute-value">${skill.wxlevel}</span>
            //     </div>`;
            // }
            
            // 潜能效率
            if (skill.potEfficiency) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">潜能效率：</span>
                    <span class="attribute-value">${skill.potEfficiency}</span>
                </div>`;
            }
            
            // 攻击
            if (skill.atk) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">攻击力系数：</span>
                    <span class="attribute-value">${skill.atk}</span>
                </div>`;
            }
            
            // damRate
            if (skill.damRate) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">伤害率系数：</span>
                    <span class="attribute-value">${skill.damRate}</span>
                </div>`;
            }
            
            // powerAtkRate
            if (skill.powerAtkRate) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">加力攻击系数：</span>
                    <span class="attribute-value">${skill.powerAtkRate}</span>
                </div>`;
            }

            // powerDamRate
            if (skill.powerDamRate) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">加力伤害系数：</span>
                    <span class="attribute-value">${skill.powerDamRate}</span>
                </div>`;
            }

            // 防御
            if (skill.def) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">防御系数：</span>
                    <span class="attribute-value">${skill.def}</span>
                </div>`;
            }
            
            // 招架
            if (skill.parry) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">招架系数：</span>
                    <span class="attribute-value">${skill.parry}</span>
                </div>`;
            }
            
            // 命中
            if (skill.hitRate) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">命中率系数：</span>
                    <span class="attribute-value">${skill.hitRate}</span>
                </div>`;
            }
            
            // 闪避
            if (skill.dodge) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">闪避系数：</span>
                    <span class="attribute-value">${skill.dodge}</span>
                </div>`;
            }
            
            // 攻速
            if (skill.atkSpd) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">攻速系数：</span>
                    <span class="attribute-value">${skill.atkSpd}</span>
                </div>`;
            }

            // 内力
            if (skill.neili) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">内力系数：</span>
                    <span class="attribute-value">${skill.neili}</span>
                </div>`;
            }
            
            // 生命
            if (skill.HpRate) {
                content += `
                <div class="attribute-row">
                    <span class="attribute-label">生命系数：</span>
                    <span class="attribute-value">${skill.HpRate}</span>
                </div>`;
            }

            content += '</div>';
            
            cardBody.innerHTML = content;
            
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            col.appendChild(card);
            container.appendChild(col);
        }
    });

    updateStats(filteredCount, totalCount);
    
    // 如果没有匹配结果
    if (filteredCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'col-12 text-center py-5';
        noResults.innerHTML = '<div class="alert alert-warning">没有找到匹配的技能。请尝试其他搜索条件。</div>';
        container.appendChild(noResults);
    }
}

// 初始化页面
function initializePage() {
    // 创建门派过滤器
    const families = getUniqueValues(skillData.skills, 'familyList');
    createFilterBadges('familyFilters', families, 'family');
    
    // 添加搜索监听器
    document.getElementById('searchInput').addEventListener('input', updateSkillList);
    
    // 初始显示技能列表
    updateSkillList();
}

// 页面加载完成后开始加载数据
window.onload = loadSkillData;