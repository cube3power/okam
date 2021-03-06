/**
 * @file Npm module helper
 * @author xiaohong8023@outlook.com
 */

const {file: fileUtil} = require('../../util');
const {getRequirePath} = fileUtil;

const DEP_DIR_NAME = 'node_modules';
const DEP_DIR_NAME_REGEXP = new RegExp(DEP_DIR_NAME, 'g');
const NEW_DEP_DIR_NAME = 'npm';

/**
 * Default dependence module directory name
 *
 * @const
 * @type {string}
 */
exports.DEFAULT_DEP_DIR_NAME = DEP_DIR_NAME;

/**
 * Resolve npm module new path to output
 *
 * @param {string} oldPath the old module path
 * @param {string} moduleDir the current module dir
 * @param {string} rebaseDepDir the dep directory to rebase
 * @return {string}
 */
exports.resolveDepModuleNewPath = function (oldPath, moduleDir, rebaseDepDir) {
    let newPath = rebaseDepDir + oldPath.substr(moduleDir.length);
    // console.log('old', oldPath, newPath, moduleDir, rebaseDepDir)

    // replace all `node_modules` to `npm` to fix weixin cannot find the module
    // if the module path exists `node_module` dir name
    let result = newPath.replace(
        DEP_DIR_NAME_REGEXP, NEW_DEP_DIR_NAME
    );

    // remove `src` to fix toutiao cannot init correctly
    return result.replace(/\\/g, '/').replace('/src/', '/')
        .replace('/okam-core/', '/okam/')
        .replace('/@babel/runtime/helpers/', '/babel/');
};

/**
 * Resolve required module id. If resolve fail, return empty.
 *
 * @param {BuildManager} buildManager the build manager
 * @param {Object} file the file to host the required module id
 * @param {string} requireModId the required module id to resolve
 * @return {?string}
 */
exports.resolve = function (buildManager, file, requireModId) {
    if (!requireModId) {
        return requireModId;
    }

    let {resolvedModIds: cacheResolveModIds} = file;
    cacheResolveModIds || (file.resolvedModIds = cacheResolveModIds = {});
    let resolveModInfo = cacheResolveModIds[requireModId];
    if (resolveModInfo) {
        return resolveModInfo.id;
    }

    let isRelModId = requireModId.charAt(0) === '.';
    let depFileFullPath = buildManager.resolve(requireModId, file);
    if (!depFileFullPath) {
        return;
    }

    let {files: fileFactory, logger} = buildManager;
    logger.debug('resolve', file.path, requireModId);

    let depFile = fileFactory.addFile(depFileFullPath);
    buildManager.addNeedBuildFile(depFile);
    file.addDeps(depFile.path);

    file.isWxCompScript && (depFile.isWxCompScript = true);
    file.isSwanCompScript && (depFile.isSwanCompScript = true);
    file.isAntCompScript && (depFile.isAntCompScript = true);

    let resolveModId = requireModId;
    if (!isRelModId) {
        let rebaseRelPath = file.resolvePath || file.path;
        resolveModId = getRequirePath(
            depFile.resolvePath || depFile.path,
            rebaseRelPath
        );
    }

    let cacheInfo = {
        id: resolveModId,
        file: depFile
    };
    cacheResolveModIds[requireModId] = cacheInfo;
    cacheResolveModIds[resolveModId] = cacheInfo;

    return resolveModId;
};
