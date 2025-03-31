// 主文件
import { loadSkillData, loadSkillAutoData, getUniqueValues } from './dataLoader.js';
import { initModals, createFilterBadges, clearFilters, matchesFilters, updateStats, toggleFilter } from './uiManager.js'; // 确保导入 toggleFilter 函数
import { updateSkillList } from './skillDisplay.js';

// 导出 skillData
export let skillData = null;

// 初始化页面
async function initializePage() {
    try {
        // 初始化所有Modal
        initModals();
        
        // 加载技能数据
        skillData = await loadSkillData();
        
        // 加载被动技能数据
        const skillAutoData = await loadSkillAutoData();
        
        // 创建门派过滤器
        const families = getUniqueValues(skillData.skills, 'familyList');
        createFilterBadges('familyFilters', families, 'family');
        
        // 创建武学属性过滤器
        const elements = getUniqueValues(skillData.skills, 'zhaoJiaDefDamageClass');
        createFilterBadges('elementFilters', elements, 'element');
        
        // 添加搜索监听器
        document.getElementById('searchInput').addEventListener('input', () => {
            const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
            updateStats(filteredCount, totalCount);
        });
        
        // 初始显示技能列表
        const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
        updateStats(filteredCount, totalCount);
        
        // 添加清除过滤器的事件处理
        window.clearFilters = (filterType) => {
            clearFilters(filterType);
            const { filteredCount, totalCount } = updateSkillList(skillData, matchesFilters);
            updateStats(filteredCount, totalCount);
        };
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

// 页面加载完成后开始初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 确保 toggleFilter 函数在全局作用域中可用
window.toggleFilter = toggleFilter;