// 武学展示逻辑模块
import { findActiveSkills, getMethodName } from './dataLoader.js';
import { modalManager, effectModal } from './uiManager.js';

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
export function createEffectLinks(effectsStr) {
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
    return typeof str === 'string' && /^[A-Z0-9]+$/.test(str) && str.length >= 2;
}

// 递归处理JSON对象中的效果ID
function processEffectIds(obj, currentId, processedIds = new Set()) {
    if (!obj) return obj;
    
    if (processedIds.has(currentId)) return obj;
    processedIds.add(currentId);
    
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('arg') && isPotentialEffectId(value) && value !== currentId) {
            result[key] = `<span class="effect-link json-effect-link" data-effect-id="${value}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${value}</span>`;
        } else if (typeof value === 'object' && value !== null) {
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
        .replace(/\\"/g, '"')
        .replace(/"<span/g, '<span')
        .replace(/<\/span>"/g, '</span>');
}

// 显示效果详情
export function showEffectDetails(effectId, activeSkillData) {
    if (!activeSkillData?.Effect?.[effectId]) {
        console.log('Effect not found:', effectId);
        return;
    }

    try {
        const effectData = activeSkillData.Effect[effectId];
        const modalElement = document.getElementById('effectModal');
        document.getElementById('effectModalLabel').textContent = `效果详情: ${effectId}`;
        
        const contentElement = document.getElementById('effectContent');
        contentElement.innerHTML = jsonToHtmlWithEffectLinks(effectData, effectId);
        
        contentElement.querySelectorAll('.json-effect-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
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
            continue;
        }
        if (obj1[key] !== obj2[key]) {
            differences[key] = obj2[key];
        }
    }
    return differences;
}

// 显示被动技能信息
export function showPassiveSkills(skillId, skillAutoData) {
    const container = document.getElementById('passiveSkillsList'); // 修改为被动技能内容区域的ID
    const passiveSkills = skillAutoData[skillId];
    
    if (!passiveSkills) {
        container.innerHTML = '<div class="alert alert-info">该武学没有关联的被动技能。</div>';
        return;
    }

    let html = '';
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

    html += `
    <div class="mb-3">
        <h4 class="text-primary">被动技能</h4>
    </div>
    <div class="mb-4">
        <h5>技能基础数据</h5>
        <p>招式平均攻击系数: ${avgAtk}</p>
        <p>招式平均前后摇: ${avgDuration}</p>
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>技能效果</th>
                        <th>描述</th>
                        <th>攻击系数</th>
                        <th>伤害系数</th>
                        <th>伤害类型</th>
                        <th>解锁等级</th>
                    </tr>
                </thead>
                <tbody>`;

    Object.values(passiveSkills).forEach(skill => {
        html += `
        <tr>
            <td>${skill.skillText}</td>
            <td>${skill.action}</td>
            <td>${skill.atk || 0}</td>
            <td>${skill.dam || 0}</td>
            <td>${skill.damageType}</td>
            <td>${skill.lv}</td>
        </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>`;

    container.innerHTML = html;
}

// 显示主动技能信息
export function showActiveSkills(skillId, activeSkillData) {
    const container = document.getElementById('activeSkillsList');
    const skillGroups = findActiveSkills(skillId, activeSkillData);
    
    if (skillGroups.length === 0) {
        container.innerHTML = '<div class="alert alert-info">该武学没有关联的主动技能。</div>';
        return;
    }

    let html = '';
    
    skillGroups.forEach((group, groupIndex) => {
        const {skillId, baseSkill, allSkills} = group;
        
        if (groupIndex > 0) {
            html += '<hr class="my-4">';
        }
        
        html += `
        <div class="mb-3">
            <h4 class="text-primary">${baseSkill.name || skillId}</h4>
        </div>`;
        
        html += `
        <div class="mb-4">
            <h5>技能基础数据</h5>
            <pre style="max-height: 200px; overflow-y: auto;">${JSON.stringify(baseSkill, null, 2)}</pre>
        </div>`;

        // 根据技能ID格式筛选第一重和第十重
        const selectedSkills = allSkills.filter(skill => {
            const skillId = skill.id;
            const isLevel1 = /^[a-zA-Z]+$/.test(skillId);
            const isLevel10 = /^[a-zA-Z]+10$/.test(skillId);
            return isLevel1 || isLevel10;
        });

        if (selectedSkills.length > 1) {
            html += `
            <div>
                <h5>各重数差异</h5>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>重数</th>
                                <th>属性</th>
                            </tr>
                        </thead>
                        <tbody>`;

            selectedSkills.forEach((skill, index) => {
                const skillText = Object.entries(skill.data)
                    .filter(([key, value]) => ['desc', 'pvpcd', 'cost', 'effects'].includes(key))
                    .map(([key, value]) => {
                        if (key === 'effects') {
                            return `${key}: ${createEffectLinks(value)}`;
                        }
                        return `${key}: ${value}`;
                    })
                    .join('<br>');

                if (skillText) {
                    html += `
                    <tr>
                        <td>第${skill.level}重</td>
                        <td>${skillText}</td>
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

    container.addEventListener('click', (e) => {
        const link = e.target.closest('.effect-link');
        if (link) {
            const effectId = link.getAttribute('data-effect-id');
            showEffectDetails(effectId, activeSkillData);
        }
    });
}

// 更新技能列表
export function updateSkillList(skillData, matchesFilters) {
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
            
            card.onclick = async () => {
                const modal = new bootstrap.Modal(document.getElementById('jsonModal'));
                const jsonContent = document.getElementById('jsonContent');
                jsonContent.textContent = JSON.stringify(skill, null, 2);
                document.getElementById('jsonModalLabel').textContent = `${skill.name || id} - 武学详情`;
                
                try {
                    console.log('Loading active skill data for skill:', id);
                    const activeSkillData = await import('./dataLoader.js').then(module => module.loadActiveSkillData());
                    console.log('Loaded activeSkillData:', activeSkillData ? 'success' : 'null');
                    showActiveSkills(id, activeSkillData);
                    
                    // 加载被动技能数据
                    const skillAutoData = await import('./dataLoader.js').then(module => module.loadSkillAutoData());
                    console.log('Loaded skillAutoData:', skillAutoData ? 'success' : 'null');
                    showPassiveSkills(id, skillAutoData);
                } catch (error) {
                    console.error('Error loading skill data:', error);
                    document.getElementById('activeSkillsList').innerHTML = 
                        '<div class="alert alert-danger">加载技能数据时出错</div>';
                }
                
                modal.show();
            };
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            cardHeader.textContent = skill.name || id;
            
            if (skill.mcmrestrict && skill.mcmrestrict.includes(',300')) {
                const jueXueBadge = document.createElement('span');
                jueXueBadge.className = 'badge bg-danger jue-xue-badge';
                jueXueBadge.textContent = '绝学';
                cardHeader.appendChild(jueXueBadge);
            }
            if (skill.wxclassify && skill.wxclassify == 'zhishi') { // 添加“知识”标识
                const zhiShiBadge = document.createElement('span');
                zhiShiBadge.className = 'badge bg-danger jue-xue-badge';
                zhiShiBadge.textContent = '知识';
                cardHeader.appendChild(zhiShiBadge);
            }
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            let content = '';
            
            if (skill.dsc) {
                const shortDesc = skill.dsc.replace(/HIW|NOR/g, '').split('\\n')[0];
                content += `<p class="skill-description" style="max-height: 3.6em; overflow-y: auto;">${shortDesc}</p>`;
            }
            
            if (skill.familyList) {
                content += `<p><strong>门派：</strong><span class="badge bg-info">${skill.familyList}</span></p>`;
            }
            
            if (skill.methods) {
                content += '<p><strong>武学类型：</strong>';
                const methodArray = typeof skill.methods === 'string' 
                    ? skill.methods.split(',') 
                    : [String(skill.methods)];
                    
                methodArray.forEach(method => {
                    const methodName = getMethodName(method.trim());
                    content += `<span class="badge bg-success">${methodName}</span> `;
                });
                content += '</p>';
            }
            
            content += '<div class="mt-3">';
            
            const attributes = [
                { key: 'potEfficiency', label: '潜能效率' },
                { key: 'atk', label: '攻击力系数' },
                { key: 'damRate', label: '伤害率系数' },
                { key: 'powerAtkRate', label: '加力攻击系数' },
                { key: 'powerDamRate', label: '加力伤害系数' },
                { key: 'def', label: '防御系数' },
                { key: 'parry', label: '招架系数' },
                { key: 'hitRate', label: '命中率系数' },
                { key: 'dodge', label: '闪避系数' },
                { key: 'atkSpd', label: '攻速系数' },
                { key: 'neili', label: '内力系数' },
                { key: 'HpRate', label: '生命系数' }
            ];

            attributes.forEach(attr => {
                if (skill[attr.key]) {
                    content += `
                    <div class="attribute-row">
                        <span class="attribute-label">${attr.label}：</span>
                        <span class="attribute-value">${skill[attr.key]}</span>
                    </div>`;
                }
            });

            content += '</div>';
            
            cardBody.innerHTML = content;
            
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            col.appendChild(card);
            container.appendChild(col);
        }
    });

    return { filteredCount, totalCount };
}