- ========================================
-- PLAYLIST ULTIMATE v28 (FAVORIT + CUSTOM ID) - META AI FIX
-- ========================================

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local StarterGui = game:GetService("StarterGui")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local MarketplaceService = game:GetService("MarketplaceService")
local AssetService = game:GetService("AssetService")
local HttpService = game:GetService("HttpService")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

-- ========================================
-- SOUND EFFECT UNTUK LOADING
-- ========================================
local LOADING_SOUND_ID = 91402883144213   -- loop selama loading
local COMPLETE_SOUND_ID = 78947034458755 -- 1x pas logo di klik

local loadingSound = nil
local completeSound = nil
local isCompleteSoundPlayed = false

local function playSound(soundId, looped, volume)
    volume = volume or 1
    local sound = Instance.new("Sound")
    sound.SoundId = "rbxassetid://" .. soundId
    sound.Volume = volume
    sound.Looped = looped or false
    sound.Parent = SoundService
    sound:Play()
    return sound
end

local function stopSound(sound)
    if sound then
        pcall(function()
            sound:Stop()
            sound:Destroy()
        end)
    end
end

-- ========================================
-- PENYIMPANAN PERMANEN
-- ========================================
local SAVE_FILE = "PlaylistFavorites.json"

local function loadUserData()
    local success, data = pcall(function()
        if readfile and isfile and isfile(SAVE_FILE) then
            return HttpService:JSONDecode(readfile(SAVE_FILE))
        end
        return {}
    end)
    if success and type(data) == "table" then
        return data
    end
    return {
        favorites = {},
        customSongs = {}
    }
end

local function saveUserData(data)
    pcall(function()
        if writefile then
            writefile(SAVE_FILE, HttpService:JSONEncode(data))
        end
    end)
end

local userData = loadUserData()
if not userData.favorites then userData.favorites = {} end
if not userData.customSongs then userData.customSongs = {} end
if not userData.deletedIds then userData.deletedIds = {} end

-- Didefinisikan di sini (sebelum loadAllSongs) supaya lagu yang udah
-- dihapus gak ke-load lagi pas script jalan ulang.
local function isDeleted(id)
    for _, delId in ipairs(userData.deletedIds) do
        if delId == id then return true end
    end
    return false
end

-- ========================================
-- AMBIL AVATAR & USERNAME
-- ========================================
local function getAvatarThumbnail(userId, size)
    size = size or 60
    return "https://www.roblox.com/headshot-thumbnail/image?userId="..userId.."&width="..size.."&height="..size.."&format=png"
end

local userId = LocalPlayer.UserId
local userName = LocalPlayer.Name
local avatarThumb = getAvatarThumbnail(userId, 60)

-- ========================================
-- CACHE + AMBIL INFO
-- ========================================
local songCache = {}
local function getSongInfo(assetId)
    if songCache[assetId] then return songCache[assetId] end
    local success, result = pcall(function()
        return MarketplaceService:GetProductInfo(tonumber(assetId))
    end)
    if success and result then
        local info = {
            id = assetId,
            title = result.Name or "Loading...",
            creator = result.Creator and result.Creator.Name or "Unknown",
            duration = result.Duration or 0,
            thumbnail = "rbxthumb://type=Asset&id="..assetId.."&w=420&h=420"
        }
        songCache[assetId] = info
        return info
    end
    return nil
end

-- ========================================
-- DATA ID LAGU
-- ========================================
local songIds = {
    "93374686543252", "124564676675935", "78692705696189", "117020806574845",
    "70575126591423", "107873904558676", "116412417614307", "117080961502380",
    "132871226683154", "75364307169277", "107773469354207", "79748457925128",
    "135018311294635", "115132356286833", "77222785479261", "118736229530151",
    "119833746241221", "88084542595291", "115694533094477", "133193396302237",
    "120983443791226", "137445115554117", "118362297271903", "105649480981056",
    "92550141644787", "133054388088474", "97948069367953", "121779673457165",
    "140193000855959", "122687131024953", "83435514857435", "128662460805771",
    "83134785201331", "76818308184811", "135095828064701", "90471492509215",
    "71778471739324", "100443758034085", "94479566899689", "133723439928073",
    "117090049200111", "76657102396566", "136239433509180", "115630253787538",
    "70868757792328", "92971085789374", "103449234987017", "114491641644706",
    "96755117635802", "117574079633196", "115832485029273", "127810125883729",
    "122656629547717", "81413479475955", "113404061006197", "120031266179399",
    "119642106977721", "112975242747165", "108179729626082", "82808551264264",
    "89361294203975", "72820481079659", "92799532573184", "120855084489897",
    "100083884425494", "133370470873426", "82828323179115", "130642267483327",
    "128990882073597", "77152319144498", "77750683321633", "86422417888834",
    "137798111576173", "121111566494630", "125071929480860", "94632661023217",
    "104538666715482", "107968763369784", "119037495327681", "129147630761109",
    "104177688386014", "103765309710247", "85699116970961", "93966344127430",
    "119254319180287", "93457817476067", "94801760770995", "125014875225876",
    "114498642134215", "99905891709896", "123418190503573", "100991657598498",
    "97785104909396", "120017030311480", "81122165966323", "99421411270011",
    "97998042800362", "125356270448095", "114037018959872", "79419489464511",
    "127164775826307", "131094825741877", "73937999550001", "118600010729764",
    "102617351804600", "129057738682991", "103004860327851", "80905866159895",
    "77063870786604", "124384558101360", "106460063662810", "108790892752137"
}

local songs = {}
local totalSongs = #songIds

-- ========================================
-- FORWARD DECLARATIONS
-- ========================================
local initPlaylist
local renderPlaylist
local nextSong
local prevSong

-- ========================================
-- LOADING SCREEN
-- ========================================
local loadingGui = Instance.new("ScreenGui")
loadingGui.Name = "LoadingScreen"
loadingGui.ResetOnSpawn = false
loadingGui.Parent = LocalPlayer:WaitForChild("PlayerGui")

local loadingFrame = Instance.new("CanvasGroup")
loadingFrame.Size = UDim2.new(0, 340, 0, 120)
loadingFrame.Position = UDim2.new(0.5, -170, 0.5, -60)
loadingFrame.BackgroundColor3 = Color3.fromRGB(8, 8, 20)
loadingFrame.BackgroundTransparency = 0.08
loadingFrame.GroupTransparency = 1
loadingFrame.BorderSizePixel = 0
loadingFrame.Active = true
loadingFrame.Draggable = true
loadingFrame.Parent = loadingGui

Instance.new("UICorner", loadingFrame).CornerRadius = UDim.new(0, 14)
Instance.new("UIStroke", loadingFrame).Color = Color3.fromRGB(80, 60, 200)
Instance.new("UIStroke", loadingFrame).Thickness = 1
Instance.new("UIStroke", loadingFrame).Transparency = 0.5

local loadingTitle = Instance.new("TextLabel")
loadingTitle.Size = UDim2.new(1, 0, 0, 28)
loadingTitle.Position = UDim2.new(0, 0, 0, 8)
loadingTitle.BackgroundTransparency = 1
loadingTitle.Text = "Please wait a moment..."
loadingTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
loadingTitle.TextSize = 14
loadingTitle.Font = Enum.Font.GothamBold
loadingTitle.TextXAlignment = Enum.TextXAlignment.Center
loadingTitle.Parent = loadingFrame

local progressBarBg = Instance.new("Frame")
progressBarBg.Size = UDim2.new(0.8, 0, 0, 10)
progressBarBg.Position = UDim2.new(0.1, 0, 0, 44)
progressBarBg.BackgroundColor3 = Color3.fromRGB(80, 60, 200)
progressBarFill.BorderSizePixel = 0
progressBarFill.Parent = progressBarBg
Instance.new("UICorner", progressBarFill).CornerRadius = UDim.new(0, 5)

local progressText = Instance.new("TextLabel")
progressText.Size = UDim2.new(1, 0, 0, 18)
progressText.Position = UDim2.new(0, 0, 0, 58)
progressText.BackgroundTransparency = 1
progressText.Text = "0% (0/0)"
progressText.TextColor3 = Color3.fromRGB(150, 150, 180)
progressText.TextSize = 10
progressText.Font = Enum.Font.Gotham
progressText.TextXAlignment = Enum.TextXAlignment.Center
progressText.Parent = loadingFrame

local copyLabel = Instance.new("TextLabel")
copyLabel.Size = UDim2.new(1, 0, 0, 16)
copyLabel.Position = UDim2.new(0, 0, 0, 95)
copyLabel.BackgroundTransparency = 1
copyLabel.Text = "© 2026 Pixxxry Code Developer JS"
copyLabel.TextColor3 = Color3.fromRGB(70, 70, 100)
copyLabel.TextSize = 9
copyLabel.Font = Enum.Font.Gotham
copyLabel.TextXAlignment = Enum.TextXAlignment.Center
copyLabel.Parent = loadingFrame

-- FADE IN
TweenService:Create(
    loadingFrame,
    TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    {GroupTransparency = 0}
):Play()

-- efek "napas"
TweenService:Create(
    loadingTitle,
    TweenInfo.new(0.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
    {TextTransparency = 0.35}
):Play()

local function updateLoading(progress, loaded, total)
    local r = 80 + 70 * (progress / 100)
    local g = 60 + 100 * (progress / 100)
    local b = 200 - 50 * (progress / 100)
    TweenService:Create(
        progressBarFill,
        TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
        {Size = UDim2.new(progress / 100, 0, 1, 0), BackgroundColor3 = Color3.fromRGB(r, g, b)}
    ):Play()
    progressText.Text = string.format("%.0f%% (%d/%d)", progress, loaded, total)
end

-- ========================================
-- LOAD ALL SONGS (BAWAAN + CUSTOM) + SOUND LOOP
-- ========================================
local function loadAllSongs()
    -- PLAY LOADING SOUND (LOOP)
    loadingSound = playSound(LOADING_SOUND_ID, true, 1)
    
    songs = {}
    local loaded = 0
    for _, id in ipairs(songIds) do
        if not isDeleted(id) then
            local info = getSongInfo(id)
            if info then
                table.insert(songs, info)
            else
                table.insert(songs, {id = id, title = "Loading...", creator = "Unknown", duration = 0, thumbnail = ""})
            end
        end
        loaded = loaded + 1
        local progress = (loaded / totalSongs) * 100
        updateLoading(progress, loaded, totalSongs)
        task.wait(0.03)
    end
    for _, custom in ipairs(userData.customSongs) do
        if not isDeleted(custom.id) then
            local info = getSongInfo(custom.id)
            if info then
                info.isCustom = true
                table.insert(songs, info)
            else
                table.insert(songs, {
                    id = custom.id,
                    title = "Loading...",
                    creator = "Custom",
                    duration = 0,
                    thumbnail = "",
                    isCustom = true
                })
            end
        end
    end
    task.wait(0.3)

    -- FADE OUT
    local fadeOut = TweenService:Create(
        loadingFrame,
        TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
        {GroupTransparency = 1}
    )
    fadeOut:Play()
    fadeOut.Completed:Wait()
    
    -- STOP LOADING SOUND
    stopSound(loadingSound)
    
    loadingGui:Destroy()
    initPlaylist()
end

-- ========================================
-- FUNGSI FAVORIT & CUSTOM
-- ========================================
local function isFavorited(id)
    for _, favId in ipairs(userData.favorites) do
        if favId == id then return true end
    end
    return false
end

local screenGui = nil
local mainFrame = nil
local currentIndex = 1
local currentSong = nil
local currentSound = nil
local currentVolume = 100
local timerLabel = nil
local nowLabel = nil
local playBtn = nil
local thumbImage = nil
local progressBarFill2 = nil
local progressBarBg2 = nil
local durationLabel = nil
local searchBox = nil
local customIdBox = nil
local statusLabel = nil
local scrollFrame = nil
local layout = nil

local function toggleFavorite(id)
    local found = false
    for i, favId in ipairs(userData.favorites) do
        if favId == id then
            table.remove(userData.favorites, i)
            found = true
            break
        end
    end
    if not found then
        table.insert(userData.favorites, id)
    end
    saveUserData(userData)

    local playingId = currentSong and currentSong.id or nil
    renderPlaylist(searchBox and searchBox.Text or "")

    if playingId then
        for i, s in ipairs(songs) do
            if s.id == playingId then
                currentIndex = i
                break
            end
        end
    end
end

local function addCustomSong()
    local id = customIdBox and customIdBox.Text or ""
    if id == "" then
        if statusLabel then
            statusLabel.Text = "⚠️ Masukkan ID!"
            statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            task.delay(2, function() if statusLabel then statusLabel.Text = "" end end)
        end
        return
    end
    if not tonumber(id) then
        if statusLabel then
            statusLabel.Text = "⚠️ ID harus angka!"
            statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
            task.delay(2, function() if statusLabel then statusLabel.Text = "" end end)
        end
        return
    end
    for _, custom in ipairs(userData.customSongs) do
        if custom.id == id then
            if statusLabel then
                statusLabel.Text = "⚠️ ID sudah ada!"
                statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
                task.delay(2, function() if statusLabel then statusLabel.Text = "" end end)
            end
            return
        end
    end
    table.insert(userData.customSongs, { id = id })
    saveUserData(userData)

    local info = getSongInfo(id)
    if info then
        info.isCustom = true
        table.insert(songs, info)
    else
        table.insert(songs, {
            id = id,
            title = "Loading...",
            creator = "Custom",
            duration = 0,
            thumbnail = "",
            isCustom = true
        })
    end

    renderPlaylist(searchBox and searchBox.Text or "")
    if customIdBox then customIdBox.Text = "" end
    if statusLabel then
        statusLabel.Text = "✅ Lagu ditambahkan!"
        statusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
        task.delay(2, function() if statusLabel then statusLabel.Text = "" end end)
    end
end

-- ========================================
-- HAPUS LAGU
-- ========================================
local function deleteSong(id)
    for i, s in ipairs(songs) do
        if s.id == id then
            table.remove(songs, i)
            break
        end
    end

    for i, favId in ipairs(userData.favorites) do
        if favId == id then
            table.remove(userData.favorites, i)
            break
        end
    end

    for i, custom in ipairs(userData.customSongs) do
        if custom.id == id then
            table.remove(userData.customSongs, i)
            break
        end
    end

    if not isDeleted(id) then
        table.insert(userData.deletedIds, id)
    end
    saveUserData(userData)

    if currentSong and currentSong.id == id then
        if currentSound then
            pcall(function() currentSound:Stop() currentSound:Destroy() end)
            currentSound = nil
        end
        if #songs > 0 then
            currentIndex = 1
            currentSong = songs[1]
            if nowLabel then nowLabel.Text = "🎵 ".. currentSong.title end
            if thumbImage then thumbImage.Image = currentSong.thumbnail or "" end
        else
            currentSong = nil
            if nowLabel then nowLabel.Text = "🎵 (kosong)" end
            if thumbImage then thumbImage.Image = "" end
        end
    end

    renderPlaylist(searchBox and searchBox.Text or "")
end

-- ========================================
-- GUI PLAYLIST
-- ========================================
local bars = {}
local noiseOffset = 0
local NUM_BARS = 18
local BAR_WIDTH = 3
local SPACING = 2

local function formatTime(seconds)
    if not seconds or seconds <= 0 then return "00:00" end
    local m = math.floor(seconds / 60)
    local s = math.floor(seconds % 60)
    return string.format("%02d:%02d", m, s)
end

initPlaylist = function()
    if #songs == 0 then
        table.insert(songs, {id = "", title = "(Playlist kosong)", creator = "-", duration = 0, thumbnail = ""})
    end
    currentSong = songs[1]
    screenGui = Instance.new("ScreenGui")
    screenGui.Name = "PlaylistUltimate"
    screenGui.ResetOnSpawn = false
    screenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")

    mainFrame = Instance.new("Frame")
    mainFrame.Size = UDim2.new(0, 380, 0.7, 0)
    mainFrame.Position = UDim2.new(0.5, -190, 0.5, 0)
    mainFrame.AnchorPoint = Vector2.new(0.5, 0.5)
    mainFrame.BackgroundColor3 = Color3.fromRGB(10, 10, 22)
    mainFrame.BackgroundTransparency = 0.15
    mainFrame.BorderSizePixel = 0
    mainFrame.Active = true
    mainFrame.Draggable = true
    mainFrame.Visible = false
    mainFrame.Parent = screenGui
    Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 14)

    -- HEADER
    local header = Instance.new("Frame")
    header.Size = UDim2.new(1, 0, 0, 32)
    header.BackgroundColor3 = Color3.fromRGB(25, 25, 45)
    header.BackgroundTransparency = 0.85
    header.BorderSizePixel = 0
    header.Parent = mainFrame
    Instance.new("UICorner", header).CornerRadius = UDim.new(0, 14)

    local avatarImage = Instance.new("ImageLabel")
    avatarImage.Size = UDim2.new(0, 24, 0, 24)
    avatarImage.Position = UDim2.new(0, 8, 0.5, -12)
    avatarImage.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
    avatarImage.BorderSizePixel = 0
    avatarImage.Image = avatarThumb
    avatarImage.Parent = header
    Instance.new("UICorner", avatarImage).CornerRadius = UDim.new(0, 12)

    local userNameLabel = Instance.new("TextLabel")
    userNameLabel.Size = UDim2.new(0.4, 0, 1, 0)
    userNameLabel.Position = UDim2.new(0, 38, 0, 0)
    userNameLabel.BackgroundTransparency = 1
    userNameLabel.Text = userName
    userNameLabel.TextColor3 = Color3.fromRGB(220, 220, 240)
    userNameLabel.TextSize = 10
    userNameLabel.Font = Enum.Font.GothamBold
    userNameLabel.TextXAlignment = Enum.TextXAlignment.Left
    userNameLabel.TextTruncate = Enum.TextTruncate.AtEnd
    userNameLabel.Parent = header

    local closeBtn = Instance.new("TextButton")
    closeBtn.Size = UDim2.new(0, 24, 0, 24)
    closeBtn.Position = UDim2.new(1, -30, 0.5, -12)
    closeBtn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
    closeBtn.Text = "X"
    closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    closeBtn.TextSize = 11
    closeBtn.BorderSizePixel = 0
    closeBtn.Parent = header
    Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 8)
    closeBtn.MouseButton1Click:Connect(function() mainFrame.Visible = false end)

    -- NOW PLAYING
    local nowFrame = Instance.new("Frame")
    nowFrame.Size = UDim2.new(1, 0, 0, 150)
    nowFrame.Position = UDim2.new(0, 0, 0, 32)
    nowFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 40)
    nowFrame.BackgroundTransparency = 0.85
    nowFrame.BorderSizePixel = 0
    nowFrame.Parent = mainFrame

    thumbImage = Instance.new("ImageLabel")
    thumbImage.Size = UDim2.new(0, 48, 0, 48)
    thumbImage.Position = UDim2.new(0, 10, 0, 6)
    thumbImage.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
    thumbImage.BorderSizePixel = 0
    thumbImage.Image = currentSong.thumbnail or ""
    thumbImage.Parent = nowFrame
    Instance.new("UICorner", thumbImage).CornerRadius = UDim.new(0, 6)

    nowLabel = Instance.new("TextLabel")
    nowLabel.Size = UDim2.new(0.55, 0, 0, 18)
    nowLabel.Position = UDim2.new(0, 66, 0, 8)
    nowLabel.BackgroundTransparency = 1
    nowLabel.Text = "🎵 ".. currentSong.title
    nowLabel.TextColor3 = Color3.fromRGB(220, 220, 240)
    nowLabel.TextSize = 10
    nowLabel.Font = Enum.Font.GothamBold
    nowLabel.TextXAlignment = Enum.TextXAlignment.Left
    nowLabel.TextTruncate = Enum.TextTruncate.AtEnd
    nowLabel.Parent = nowFrame

    local creatorLabel = Instance.new("TextLabel")
    creatorLabel.Size = UDim2.new(0.55, 0, 0, 14)
    creatorLabel.Position = UDim2.new(0, 66, 0, 28)
    creatorLabel.BackgroundTransparency = 1
    creatorLabel.Text = "👤 ".. (currentSong.creator or "Unknown")
    creatorLabel.TextColor3 = Color3.fromRGB(150, 150, 180)
    creatorLabel.TextSize = 8
    creatorLabel.Font = Enum.Font.Gotham
    creatorLabel.TextXAlignment = Enum.TextXAlignment.Left
    creatorLabel.TextTruncate = Enum.TextTruncate.AtEnd
    creatorLabel.Parent = nowFrame

    -- CONTROLS
    local controlsFrame = Instance.new("Frame")
    controlsFrame.Size = UDim2.new(1, 0, 0, 34)
    controlsFrame.Position = UDim2.new(0, 0, 0, 48)
    controlsFrame.BackgroundTransparency = 1
    controlsFrame.Parent = nowFrame

    local controlsLayout = Instance.new("UIListLayout")
    controlsLayout.Parent = controlsFrame
    controlsLayout.FillDirection = Enum.FillDirection.Horizontal
    controlsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    controlsLayout.VerticalAlignment = Enum.VerticalAlignment.Center
    controlsLayout.Padding = UDim.new(0, 10)

    local prevBtn = Instance.new("TextButton")
    prevBtn.Size = UDim2.new(0, 32, 0, 32)
    prevBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 48)
    prevBtn.Text = "◀"
    prevBtn.TextColor3 = Color3.fromRGB(200, 200, 210)
    prevBtn.TextSize = 14
    prevBtn.Font = Enum.Font.GothamBold
    prevBtn.BorderSizePixel = 0
    prevBtn.Parent = controlsFrame
    Instance.new("UICorner", prevBtn).CornerRadius = UDim.new(0, 16)

    playBtn = Instance.new("TextButton")
    playBtn.Size = UDim2.new(0, 38, 0, 38)
    playBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 48)
    playBtn.Text = "▶"
    playBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    playBtn.TextSize = 18
    playBtn.Font = Enum.Font.GothamBold
    playBtn.BorderSizePixel = 0
    playBtn.Parent = controlsFrame
    Instance.new("UICorner", playBtn).CornerRadius = UDim.new(0, 19)

    local nextBtn = Instance.new("TextButton")
    nextBtn.Size = UDim2.new(0, 32, 0, 32)
    nextBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 48)
    nextBtn.Text = "▶"
    nextBtn.TextColor3 = Color3.fromRGB(200, 200, 210)
    nextBtn.TextSize = 14
    nextBtn.Font = Enum.Font.GothamBold
    nextBtn.BorderSizePixel = 0
    nextBtn.Parent = controlsFrame
    Instance.new("UICorner", nextBtn).CornerRadius = UDim.new(0, 16)

    -- WAVEFORM
    local waveformContainer = Instance.new("Frame")
    waveformContainer.Size = UDim2.new(0.6, 0, 0, 16)
    waveformContainer.Position = UDim2.new(0.2, 0, 0, 84)
    waveformContainer.BackgroundTransparency = 1
    waveformContainer.ZIndex = 2
    waveformContainer.Parent = nowFrame

    local function createWaveform()
        bars = {}
        local totalWidth = NUM_BARS * (BAR_WIDTH + SPACING) - SPACING
        local containerWidth = waveformContainer.AbsoluteSize.X or 200
        local startX = (containerWidth - totalWidth) / 2
        if startX < 0 then startX = 2 end
        for i = 1, NUM_BARS do
            local bar = Instance.new("Frame")
            bar.Size = UDim2.new(0, BAR_WIDTH, 0, 3)
            bar.Position = UDim2.new(0, startX + (i-1) * (BAR_WIDTH + SPACING), 1, 0)
            bar.AnchorPoint = Vector2.new(0, 1)
            bar.BackgroundColor3 = Color3.fromRGB(180, 180, 200)
            bar.BorderSizePixel = 0
            bar.ZIndex = 3
            bar.Parent = waveformContainer
            Instance.new("UICorner", bar).CornerRadius = UDim.new(0, 1)
            table.insert(bars, {frame = bar, currentHeight = 3})
        end
    end
    createWaveform()

    local function updateWaveform()
        if not currentSound or not currentSound.IsPlaying then
            for _, bar in ipairs(bars) do
                bar.currentHeight = bar.currentHeight + (3 - bar.currentHeight) * 0.1
                bar.frame.Size = UDim2.new(0, BAR_WIDTH, 0, bar.currentHeight)
            end
            return
        end
        noiseOffset = noiseOffset + 0.15
        local amplitude = currentSound.PlaybackLoudness or 0
        local normalized = math.min(amplitude / 600, 1)
        for i, bar in ipairs(bars) do
            local base = math.sin(i * 0.4 + noiseOffset * 2) * 0.5 + math.cos(i * 0.7 + noiseOffset) * 0.5
            local beat = amplitude > 400 and math.sin(tick() * 20 + i) * 0.3 or 0
            local height = 3 + (normalized * 13) * (0.3 + 0.7 * (base + beat))
            height = math.clamp(height, 3, 13)
            bar.currentHeight = bar.currentHeight + (height - bar.currentHeight) * 0.25
            bar.frame.Size = UDim2.new(0, BAR_WIDTH, 0, bar.currentHeight)
            local intensity = math.min(bar.currentHeight / 13, 1)
            local r = 120 + 80 * intensity
            local g = 120 + 80 * intensity
            local b = 150 + 80 * intensity
            bar.frame.BackgroundColor3 = Color3.fromRGB(math.clamp(r,0,255), math.clamp(g,0,255), math.clamp(b,0,255))
        end
    end

    -- TIMER + PROGRESS BAR
    timerLabel = Instance.new("TextLabel")
    timerLabel.Size = UDim2.new(0.1, 0, 0, 14)
    timerLabel.Position = UDim2.new(0.02, 0, 0, 105)
    timerLabel.BackgroundTransparency = 1
    timerLabel.Text = "00:00"
    timerLabel.TextColor3 = Color3.fromRGB(200, 200, 230)
    timerLabel.TextSize = 9
    timerLabel.Font = Enum.Font.GothamBold
    timerLabel.TextXAlignment = Enum.TextXAlignment.Left
    timerLabel.Parent = nowFrame

    progressBarBg2 = Instance.new("Frame")
    progressBarBg2.Size = UDim2.new(0.78, 0, 0, 3)
    progressBarBg2.Position = UDim2.new(0.12, 0, 0, 110)
    progressBarBg2.BackgroundColor3 = Color3.fromRGB(40, 40, 60)
    progressBarBg2.BorderSizePixel = 0
    progressBarBg2.Parent = nowFrame
    Instance.new("UICorner", progressBarBg2).CornerRadius = UDim.new(0, 2)

    progressBarFill2 = Instance.new("Frame")
    progressBarFill2.Size = UDim2.new(0, 0, 1, 0)
    progressBarFill2.BackgroundColor3 = Color3.fromRGB(180, 150, 255)
    progressBarFill2.BorderSizePixel = 0
    progressBarFill2.Parent = progressBarBg2
    Instance.new("UICorner", progressBarFill2).CornerRadius = UDim.new(0, 2)

    durationLabel = Instance.new("TextLabel")
    durationLabel.Size = UDim2.new(0.1, 0, 0, 14)
    durationLabel.Position = UDim2.new(0.89, 0, 0, 105)
    durationLabel.BackgroundTransparency = 1
    durationLabel.Text = "00:00"
    durationLabel.TextColor3 = Color3.fromRGB(150, 150, 180)
    durationLabel.TextSize = 9
    durationLabel.Font = Enum.Font.Gotham
    durationLabel.TextXAlignment = Enum.TextXAlignment.Right
    durationLabel.Parent = nowFrame

    -- SEARCH BAR + CUSTOM ID
    local topBarFrame = Instance.new("Frame")
    topBarFrame.Size = UDim2.new(1, 0, 0, 40)
    topBarFrame.Position = UDim2.new(0, 0, 0, 150)
    topBarFrame.BackgroundTransparency = 1
    topBarFrame.Parent = mainFrame

    searchBox = Instance.new("TextBox")
    searchBox.Size = UDim2.new(0.45, 0, 0, 18)
    searchBox.Position = UDim2.new(0.02, 0, 0, 2)
    searchBox.BackgroundColor3 = Color3.fromRGB(25, 25, 42)
    searchBox.BackgroundTransparency = 0.3
    searchBox.Text = ""
    searchBox.PlaceholderText = "🔍 Cari lagu..."
    searchBox.TextColor3 = Color3.fromRGB(255, 255, 255)
    searchBox.PlaceholderColor3 = Color3.fromRGB(100, 100, 130)
    searchBox.TextSize = 9
    searchBox.Font = Enum.Font.Gotham
    searchBox.ClearTextOnFocus = false
    searchBox.Parent = topBarFrame
    Instance.new("UICorner", searchBox).CornerRadius = UDim.new(0, 6)

    customIdBox = Instance.new("TextBox")
    customIdBox.Size = UDim2.new(0.35, 0, 0, 18)
    customIdBox.Position = UDim2.new(0.48, 0, 0, 2)
    customIdBox.BackgroundColor3 = Color3.fromRGB(25, 25, 42)
    customIdBox.BackgroundTransparency = 0.3
    customIdBox.Text = ""
    customIdBox.PlaceholderText = "➕ Tambahkan Lagu Anda"
    customIdBox.TextColor3 = Color3.fromRGB(255, 255, 255)
    customIdBox.PlaceholderColor3 = Color3.fromRGB(100, 100, 130)
    customIdBox.TextSize = 9
    customIdBox.Font = Enum.Font.Gotham
    customIdBox.ClearTextOnFocus = false
    customIdBox.Parent = topBarFrame
    Instance.new("UICorner", customIdBox).CornerRadius = UDim.new(0, 6)

    local addCustomBtn = Instance.new("TextButton")
    addCustomBtn.Size = UDim2.new(0.1, 0, 0, 18)
    addCustomBtn.Position = UDim2.new(0.84, 0, 0, 2)
    addCustomBtn.BackgroundColor3 = Color3.fromRGB(40, 80, 160)
    addCustomBtn.BackgroundTransparency = 0.3
    addCustomBtn.Text = "➕"
    addCustomBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    addCustomBtn.TextSize = 11
    addCustomBtn.Font = Enum.Font.GothamBold
    addCustomBtn.BorderSizePixel = 0
    addCustomBtn.Parent = topBarFrame
    Instance.new("UICorner", addCustomBtn).CornerRadius = UDim.new(0, 6)
    addCustomBtn.MouseButton1Click:Connect(addCustomSong)

    statusLabel = Instance.new("TextLabel")
    statusLabel.Size = UDim2.new(0.5, 0, 0, 14)
    statusLabel.Position = UDim2.new(0.25, 0, 0, 22)
    statusLabel.BackgroundTransparency = 1
    statusLabel.Text = ""
    statusLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
    statusLabel.TextSize = 8
    statusLabel.Font = Enum.Font.Gotham
    statusLabel.Parent = topBarFrame

    -- SCROLL FRAME
    scrollFrame = Instance.new("ScrollingFrame")
    scrollFrame.Size = UDim2.new(1, -12, 1, -195)
    scrollFrame.Position = UDim2.new(0, 6, 0, 190)
    scrollFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 40)
    scrollFrame.BackgroundTransparency = 0.15
    scrollFrame.BorderSizePixel = 0
    scrollFrame.ScrollBarThickness = 4
    scrollFrame.ScrollingEnabled = true
    scrollFrame.VerticalScrollBarInset = Enum.ScrollBarInset.ScrollBar
    scrollFrame.Parent = mainFrame
    Instance.new("UICorner", scrollFrame).CornerRadius = UDim.new(0, 8)

    local padding = Instance.new("UIPadding")
    padding.PaddingTop = UDim.new(0, 4)
    padding.PaddingBottom = UDim.new(0, 10)
    padding.PaddingLeft = UDim.new(0, 4)
    padding.PaddingRight = UDim.new(0, 4)
    padding.Parent = scrollFrame

    layout = Instance.new("UIListLayout")
    layout.Parent = scrollFrame
    layout.FillDirection = Enum.FillDirection.Vertical
    layout.SortOrder = Enum.SortOrder.LayoutOrder
    layout.Padding = UDim.new(0, 2)
    layout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
        scrollFrame.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y + 20)
    end)

    -- POPUP KONFIRMASI HAPUS
    local pendingDeleteId = nil

    local confirmOverlay = Instance.new("Frame")
    confirmOverlay.Size = UDim2.new(1, 0, 1, 0)
    confirmOverlay.Position = UDim2.new(0, 0, 0, 0)
    confirmOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
    confirmOverlay.BackgroundTransparency = 0.4
    confirmOverlay.BorderSizePixel = 0
    confirmOverlay.Visible = false
    confirmOverlay.ZIndex = 20
    confirmOverlay.Parent = mainFrame

    local confirmBox = Instance.new("Frame")
    confirmBox.Size = UDim2.new(0, 260, 0, 110)
    confirmBox.Position = UDim2.new(0.5, -130, 0.5, -55)
    confirmBox.BackgroundColor3 = Color3.fromRGB(25, 25, 45)
    confirmBox.BorderSizePixel = 0
    confirmBox.ZIndex = 21
    confirmBox.Parent = confirmOverlay
    Instance.new("UICorner", confirmBox).CornerRadius = UDim.new(0, 10)
    local confirmStroke = Instance.new("UIStroke")
    confirmStroke.Color = Color3.fromRGB(200, 60, 60)
    confirmStroke.Thickness = 1
    confirmStroke.Transparency = 0.4
    confirmStroke.Parent = confirmBox

    local confirmText = Instance.new("TextLabel")
    confirmText.Size = UDim2.new(1, -16, 0, 50)
    confirmText.Position = UDim2.new(0, 8, 0, 10)
    confirmText.BackgroundTransparency = 1
    confirmText.Text = "Hapus lagu ini?"
    confirmText.TextColor3 = Color3.fromRGB(230, 230, 240)
    confirmText.TextSize = 11
    confirmText.Font = Enum.Font.GothamBold
    confirmText.TextWrapped = true
    confirmText.ZIndex = 22
    confirmText.Parent = confirmBox

    local confirmYesBtn = Instance.new("TextButton")
    confirmYesBtn.Size = UDim2.new(0, 108, 0, 30)
    confirmYesBtn.Position = UDim2.new(0, 20, 1, -40)
    confirmYesBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
    confirmYesBtn.Text = "Ya, Hapus"
    confirmYesBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    confirmYesBtn.TextSize = 10
    confirmYesBtn.Font = Enum.Font.GothamBold
    confirmYesBtn.BorderSizePixel = 0
    confirmYesBtn.ZIndex = 22
    confirmYesBtn.Parent = confirmBox
    Instance.new("UICorner", confirmYesBtn).CornerRadius = UDim.new(0, 6)

    local confirmNoBtn = Instance.new("TextButton")
    confirmNoBtn.Size = UDim2.new(0, 108, 0, 30)
    confirmNoBtn.Position = UDim2.new(1, -128, 1, -40)
    confirmNoBtn.BackgroundColor3 = Color3.fromRGB(60, 60, 90)
    confirmNoBtn.Text = "Batal"
    confirmNoBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    confirmNoBtn.TextSize = 10
    confirmNoBtn.Font = Enum.Font.GothamBold
    confirmNoBtn.BorderSizePixel = 0
    confirmNoBtn.ZIndex = 22
    confirmNoBtn.Parent = confirmBox
    Instance.new("UICorner", confirmNoBtn).CornerRadius = UDim.new(0, 6)

    local function showDeleteConfirm(songId, songTitle)
        pendingDeleteId = songId
        confirmText.Text = "Hapus \"".. songTitle .."\" dari playlist?"
        confirmOverlay.Visible = true
    end

    confirmYesBtn.MouseButton1Click:Connect(function()
        confirmOverlay.Visible = false
        if pendingDeleteId then
            deleteSong(pendingDeleteId)
            pendingDeleteId = nil
        end
    end)

    confirmNoBtn.MouseButton1Click:Connect(function()
        confirmOverlay.Visible = false
        pendingDeleteId = nil
    end)

    -- FUNGSI
    local function updateThumbnail(song)
        if song and song.thumbnail then
            thumbImage.Image = song.thumbnail
        else
            thumbImage.Image = ""
        end
    end

    local function updateTimerAndProgress()
        if currentSound then
            local len = currentSound.TimeLength or 0
            local pos = currentSound.TimePosition or 0
            timerLabel.Text = formatTime(math.max(pos, 0))
            durationLabel.Text = formatTime(len)
            if len > 0 then
                progressBarFill2.Size = UDim2.new(math.clamp(pos / len, 0, 1), 0, 1, 0)
            end
        else
            timerLabel.Text = "00:00"
            durationLabel.Text = "00:00"
            progressBarFill2.Size = UDim2.new(0, 0, 1, 0)
        end
    end

    local function updatePlayButton()
        if currentSound and currentSound.IsPlaying then
            playBtn.Text = "⏸"
        else
            playBtn.Text = "▶"
        end
    end

    -- PLAY SOUND
    local function playSoundInternal(index)
        local song = songs[index]
        if not song then return end
        if currentSound then
            pcall(function() currentSound:Stop() currentSound:Destroy() end)
            currentSound = nil
        end
        timerLabel.Text = "00:00"
        durationLabel.Text = "00:00"
        progressBarFill2.Size = UDim2.new(0, 0, 1, 0)

        local sound = Instance.new("Sound")
        sound.SoundId = "rbxassetid://".. song.id
        sound.Volume = 1
        sound.Looped = false
        sound.Parent = workspace
        currentSound = sound

        local started = false

        local function tryPlay()
            if currentSound ~= sound or started then return end
            started = true
            sound:Play()
            updatePlayButton()
        end

        local function skipBrokenSong()
            if currentSound ~= sound or started then return end
            pcall(function() sound:Destroy() end)
            if currentSound == sound then currentSound = nil end
            nextSong()
        end

        if sound.IsLoaded then
            tryPlay()
        else
            sound.Loaded:Connect(tryPlay)
            task.delay(8, function()
                if currentSound == sound and not started then
                    skipBrokenSong()
                end
            end)
        end

        sound.Failed:Connect(function()
            print("❌ Gagal: "..song.id)
            skipBrokenSong()
        end)

        sound.Ended:Connect(function()
            if currentSound ~= sound then return end
            currentSound = nil
            updatePlayButton()
            nextSong()
        end)
    end

    nextSong = function()
        if #songs == 0 then return end
        currentIndex = currentIndex + 1
        if currentIndex > #songs then currentIndex = 1 end
        currentSong = songs[currentIndex]
        nowLabel.Text = "🎵 ".. currentSong.title
        updateThumbnail(currentSong)
        if currentSound then
            pcall(function() currentSound:Stop() currentSound:Destroy() end)
            currentSound = nil
        end
        spawn(function() playSoundInternal(currentIndex) end)
    end

    prevSong = function()
        if #songs == 0 then return end
        currentIndex = currentIndex - 1
        if currentIndex < 1 then currentIndex = #songs end
        currentSong = songs[currentIndex]
        nowLabel.Text = "🎵 ".. currentSong.title
        updateThumbnail(currentSong)
        if currentSound then
            pcall(function() currentSound:Stop() currentSound:Destroy() end)
            currentSound = nil
        end
        spawn(function() playSoundInternal(currentIndex) end)
    end

    local function togglePlay()
        if not currentSound then playSoundInternal(currentIndex) return end
        if currentSound.IsPlaying then
            currentSound:Pause()
        else
            currentSound:Resume()
        end
        updatePlayButton()
    end

    -- RENDER PLAYLIST
    local catalogSearchToken = 0

    local catalogSection = Instance.new("Frame")
    catalogSection.Name = "CatalogSection"
    catalogSection.Size = UDim2.new(1, -4, 0, 0)
    catalogSection.AutomaticSize = Enum.AutomaticSize.Y
    catalogSection.BackgroundTransparency = 1
    catalogSection.LayoutOrder = 999999
    catalogSection.Visible = false
    catalogSection.Parent = scrollFrame

    local catalogSectionLayout = Instance.new("UIListLayout")
    catalogSectionLayout.Parent = catalogSection
    catalogSectionLayout.SortOrder = Enum.SortOrder.LayoutOrder
    catalogSectionLayout.Padding = UDim.new(0, 3)

    local function clearCatalogSection()
        for _, child in ipairs(catalogSection:GetChildren()) do
            if child ~= catalogSectionLayout then child:Destroy() end
        end
    end

    local function addCatalogSongToPlaylist(id, title, creatorName)
        for _, s in ipairs(songs) do
            if s.id == id then return end
        end
        local info = {
            id = id,
            title = title,
            creator = creatorName,
            duration = 0,
            thumbnail = "rbxthumb://type=Asset&id="..id.."&w=420&h=420",
            isCustom = true
        }
        songCache[id] = info
        table.insert(songs, info)
        table.insert(userData.customSongs, { id = id })
        saveUserData(userData)
        if statusLabel then
            statusLabel.Text = "✅ \""..title.."\" ditambahin ke playlist!"
            statusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
            task.delay(2, function() if statusLabel then statusLabel.Text = "" end end)
        end
        renderPlaylist(searchBox and searchBox.Text or "")
    end

    local function playCatalogSong(id, title, creatorName)
        if currentSound then
            pcall(function() currentSound:Stop() currentSound:Destroy() end)
            currentSound = nil
        end
        timerLabel.Text = "00:00"
        durationLabel.Text = "00:00"
        progressBarFill2.Size = UDim2.new(0, 0, 1, 0)

        local sound = Instance.new("Sound")
        sound.SoundId = "rbxassetid://"..id
        sound.Volume = 1
        sound.Looped = false
        sound.Parent = workspace
        currentSound = sound

        currentSong = {
            id = id,
            title = title,
            creator = creatorName,
            thumbnail = "rbxthumb://type=Asset&id="..id.."&w=420&h=420"
        }
        if nowLabel then nowLabel.Text = "🎵 (Preview) "..title end
        updateThumbnail(currentSong)

        local function tryPlay()
            if currentSound ~= sound then return end
            sound:Play()
            updatePlayButton()
        end

        if sound.IsLoaded then
            tryPlay()
        else
            sound.Loaded:Connect(tryPlay)
        end

        sound.Failed:Connect(function()
            print("❌ Gagal preview: "..id)
        end)

        sound.Ended:Connect(function()
            if currentSound ~= sound then return end
            currentSound = nil
            updatePlayButton()
        end)
    end

    local function buildCatalogResultCard(order, id, title, creatorName)
        local card = Instance.new("TextButton")
        card.Size = UDim2.new(1, -4, 0, 40)
        card.LayoutOrder = order
        card.BackgroundColor3 = Color3.fromRGB(28, 42, 55)
        card.BackgroundTransparency = 0.15
        card.BorderSizePixel = 0
        card.Text = ""
        card.AutoButtonColor = false
        card.Parent = catalogSection
        Instance.new("UICorner", card).CornerRadius = UDim.new(0, 5)
        local cardStroke = Instance.new("UIStroke")
        cardStroke.Color = Color3.fromRGB(40, 130, 160)
        cardStroke.Thickness = 1
        cardStroke.Transparency = 0.6
        cardStroke.Parent = card

        local thumb = Instance.new("ImageLabel")
        thumb.Size = UDim2.new(0, 32, 0, 32)
        thumb.Position = UDim2.new(0, 4, 0.5, -16)
        thumb.BackgroundColor3 = Color3.fromRGB(40, 40, 65)
        thumb.BorderSizePixel = 0
        thumb.Image = "rbxthumb://type=Asset&id="..id.."&w=150&h=150"
        thumb.Parent = card
        Instance.new("UICorner", thumb).CornerRadius = UDim.new(0, 4)

        local titleLbl = Instance.new("TextLabel")
        titleLbl.Size = UDim2.new(1, -90, 0, 16)
        titleLbl.Position = UDim2.new(0, 42, 0, 4)
        titleLbl.BackgroundTransparency = 1
        titleLbl.Text = title
        titleLbl.TextColor3 = Color3.fromRGB(220, 235, 240)
        titleLbl.TextSize = 9
        titleLbl.Font = Enum.Font.GothamBold
        titleLbl.TextXAlignment = Enum.TextXAlignment.Left
        titleLbl.TextTruncate = Enum.TextTruncate.AtEnd
        titleLbl.Parent = card

        local creatorLbl = Instance.new("TextLabel")
        creatorLbl.Size = UDim2.new(1, -90, 0, 12)
        creatorLbl.Position = UDim2.new(0, 42, 0, 20)
        creatorLbl.BackgroundTransparency = 1
        creatorLbl.Text = "👤 "..creatorName
        creatorLbl.TextColor3 = Color3.fromRGB(140, 170, 180)
        creatorLbl.TextSize = 7.5
        creatorLbl.Font = Enum.Font.Gotham
        creatorLbl.TextXAlignment = Enum.TextXAlignment.Left
        creatorLbl.TextTruncate = Enum.TextTruncate.AtEnd
        creatorLbl.Parent = card

        local addBtn = Instance.new("TextButton")
        addBtn.Size = UDim2.new(0, 34, 0, 24)
        addBtn.Position = UDim2.new(1, -40, 0.5, -12)
        addBtn.BackgroundColor3 = Color3.fromRGB(40, 80, 160)
        addBtn.Text = "➕"
        addBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
        addBtn.TextSize = 12
        addBtn.BorderSizePixel = 0
        addBtn.Parent = card
        Instance.new("UICorner", addBtn).CornerRadius = UDim.new(0, 5)
        addBtn.MouseButton1Click:Connect(function()
            addBtn.Text = "✅"
            addCatalogSongToPlaylist(id, title, creatorName)
        end)

        card.MouseButton1Click:Connect(function()
            playCatalogSong(id, title, creatorName)
        end)
    end

    local function requestCatalogSearch(keyword)
        catalogSearchToken = catalogSearchToken + 1
        local myToken = catalogSearchToken

        if not keyword or keyword:match("^%s*$") or #keyword < 2 then
            catalogSection.Visible = false
            clearCatalogSection()
            return
        end

        catalogSection.Visible = true
        clearCatalogSection()
        local searchingLbl = Instance.new("TextLabel")
        searchingLbl.Name = "CatalogHeaderLabel"
        searchingLbl.Size = UDim2.new(1, 0, 0, 18)
        searchingLbl.BackgroundTransparency = 1
        searchingLbl.Text = "🌐 Mencari di Roblox..."
        searchingLbl.TextColor3 = Color3.fromRGB(120, 170, 190)
        searchingLbl.TextSize = 9
        searchingLbl.Font = Enum.Font.GothamBold
        searchingLbl.TextXAlignment = Enum.TextXAlignment.Left
        searchingLbl.LayoutOrder = 0
        searchingLbl.Parent = catalogSection

        task.spawn(function()
            task.wait(0.45)
            if myToken ~= catalogSearchToken then return end

            local params = Instance.new("AudioSearchParams")
            params.AudioSubType = Enum.AudioSubType.Music
            params.SearchKeyword = keyword

            local success, result = pcall(function()
                return AssetService:SearchAudio(params)
            end)

            if myToken ~= catalogSearchToken then return end
            clearCatalogSection()

            if not success or not result then
                local errLbl = Instance.new("TextLabel")
                errLbl.Size = UDim2.new(1, 0, 0, 18)
                errLbl.BackgroundTransparency = 1
                errLbl.Text = " ❌ Pencarian gagal"
                errLbl.TextColor3 = Color3.fromRGB(255, 130, 130)
                errLbl.TextSize = 9
                errLbl.Font = Enum.Font.GothamBold
                errLbl.TextXAlignment = Enum.TextXAlignment.Left
                errLbl.Parent = catalogSection
                return
            end

            local page = result:GetCurrentPage()
            local shown = 0
            local headerLbl = Instance.new("TextLabel")
            headerLbl.Size = UDim2.new(1, 0, 0, 18)
            headerLbl.BackgroundTransparency = 1
            headerLbl.TextColor3 = Color3.fromRGB(120, 190, 210)
            headerLbl.TextSize = 9
            headerLbl.Font = Enum.Font.GothamBold
            headerLbl.TextXAlignment = Enum.TextXAlignment.Left
            headerLbl.LayoutOrder = 0
            headerLbl.Parent = catalogSection

            if not page or #page == 0 then
                headerLbl.Text = "🌐 Gak ada hasil dari Roblox buat \""..keyword.."\""
                return
            end

            for order, audio in ipairs(page) do
                local id = tostring(audio.Id)
                local alreadyInPlaylist = false
                for _, s in ipairs(songs) do
                    if s.id == id then alreadyInPlaylist = true break end
                end
                if not alreadyInPlaylist then
                    local title = audio.Title or "Unknown"
                    local creatorName = (audio.Creator and audio.Creator.Name) or "Unknown"
                    buildCatalogResultCard(order, id, title, creatorName)
                    shown = shown + 1
                end
            end

            headerLbl.Text = shown > 0
                and ("🌐 Hasil dari Roblox ("..shown..")")
                or "🌐 Semua hasil buat keyword ini udah ada di playlist kamu"
        end)
    end

    renderPlaylist = function(filter)
        filter = filter or ""
        filter = filter:lower()
        for _, child in pairs(scrollFrame:GetChildren()) do
            if child ~= layout and child ~= padding and child ~= catalogSection then
                child:Destroy()
            end
        end

        local favItems = {}
        local nonFavItems = {}
        for i, s in ipairs(songs) do
            local match = filter == "" or s.title:lower():find(filter)
            if match then
                if isFavorited(s.id) then
                    table.insert(favItems, {index = i, data = s})
                else
                    table.insert(nonFavItems, {index = i, data = s})
                end
            end
        end

        local filtered = {}
        for _, item in ipairs(favItems) do
            table.insert(filtered, item)
        end
        for _, item in ipairs(nonFavItems) do
            table.insert(filtered, item)
        end

        requestCatalogSearch(filter)

        if #filtered == 0 then
            if filter == "" then
                local empty = Instance.new("TextLabel")
                empty.Size = UDim2.new(1, 0, 0, 30)
                empty.BackgroundTransparency = 1
                empty.Text = "🔍 Tidak ada lagu"
                empty.TextColor3 = Color3.fromRGB(150, 150, 180)
                empty.TextSize = 10
                empty.Font = Enum.Font.Gotham
                empty.LayoutOrder = -1
                empty.Parent = scrollFrame
            end
            return
        end

        if filter ~= "" then
            local localHeader = Instance.new("TextLabel")
            localHeader.Name = "LocalHeaderLabel"
            localHeader.Size = UDim2.new(1, 0, 0, 16)
            localHeader.BackgroundTransparency = 1
            localHeader.Text = "🌐 Hasil Dari Playlist ("..#filtered..")"
            localHeader.TextColor3 = Color3.fromRGB(180, 180, 210)
            localHeader.TextSize = 9
            localHeader.Font = Enum.Font.GothamBold
            localHeader.TextXAlignment = Enum.TextXAlignment.Left
            localHeader.LayoutOrder = 0
            localHeader.Parent = scrollFrame
        end

        local layoutOrder = 1
        for _, item in ipairs(filtered) do
            local s = item.data
            local i = item.index
            local isFav = isFavorited(s.id)

            local btn = Instance.new("TextButton")
            btn.Size = UDim2.new(1, -4, 0, 22)
            btn.BackgroundColor3 = isFav and Color3.fromRGB(60, 40, 80) or Color3.fromRGB(40, 40, 65)
            btn.BackgroundTransparency = 0.1
            btn.BorderSizePixel = 0
            btn.Text = ""
            btn.LayoutOrder = layoutOrder
            layoutOrder = layoutOrder + 1
            btn.Parent = scrollFrame
            Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 4)

            local thumbSmall = Instance.new("ImageLabel")
            thumbSmall.Size = UDim2.new(0, 18, 0, 18)
            thumbSmall.Position = UDim2.new(0, 2, 0.5, -9)
            thumbSmall.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
            thumbSmall.BorderSizePixel = 0
            thumbSmall.Image = s.thumbnail or ""
            thumbSmall.Parent = btn
            Instance.new("UICorner", thumbSmall).CornerRadius = UDim.new(0, 3)

            local idxLabel = Instance.new("TextLabel")
            idxLabel.Size = UDim2.new(0, 16, 1, 0)
            idxLabel.Position = UDim2.new(0, 24, 0, 0)
            idxLabel.BackgroundTransparency = 1
            idxLabel.Text = tostring(i)
            idxLabel.TextColor3 = Color3.fromRGB(120, 120, 170)
            idxLabel.TextSize = 7
            idxLabel.Font = Enum.Font.Gotham
            idxLabel.TextXAlignment = Enum.TextXAlignment.Center
            idxLabel.Parent = btn

            local titleLabel = Instance.new("TextLabel")
            titleLabel.Size = UDim2.new(0, 200, 1, 0)
            titleLabel.Position = UDim2.new(0, 44, 0, 0)
            titleLabel.BackgroundTransparency = 1
            titleLabel.Text = s.title
            titleLabel.TextColor3 = Color3.fromRGB(220, 220, 240)
            titleLabel.TextSize = 9
            titleLabel.Font = Enum.Font.Gotham
            titleLabel.TextXAlignment = Enum.TextXAlignment.Left
            titleLabel.TextTruncate = Enum.TextTruncate.AtEnd
            titleLabel.Parent = btn

            local deleteBtn = Instance.new("TextButton")
            deleteBtn.Size = UDim2.new(0, 20, 0, 16)
            deleteBtn.Position = UDim2.new(1, -70, 0.5, -8)
            deleteBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 80)
            deleteBtn.Text = "🗑️"
            deleteBtn.TextColor3 = Color3.fromRGB(255, 130, 130)
            deleteBtn.TextSize = 9
            deleteBtn.BorderSizePixel = 0
            deleteBtn.Parent = btn
            Instance.new("UICorner", deleteBtn).CornerRadius = UDim.new(0, 3)
            deleteBtn.MouseButton1Click:Connect(function()
                showDeleteConfirm(s.id, s.title)
            end)

            local favBtn = Instance.new("TextButton")
            favBtn.Size = UDim2.new(0, 18, 0, 16)
            favBtn.Position = UDim2.new(1, -46, 0.5, -8)
            favBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 80)
            favBtn.Text = isFav and "⭐" or "☆"
            favBtn.TextColor3 = isFav and Color3.fromRGB(255, 200, 50) or Color3.fromRGB(150, 150, 180)
            favBtn.TextSize = 10
            favBtn.BorderSizePixel = 0
            favBtn.Parent = btn
            Instance.new("UICorner", favBtn).CornerRadius = UDim.new(0, 3)
            favBtn.MouseButton1Click:Connect(function()
                toggleFavorite(s.id)
            end)

            local copyBtn = Instance.new("TextButton")
            copyBtn.Size = UDim2.new(0, 20, 0, 16)
            copyBtn.Position = UDim2.new(1, -24, 0.5, -8)
            copyBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 80)
            copyBtn.Text = "📋"
            copyBtn.TextColor3 = Color3.fromRGB(200, 200, 220)
            copyBtn.TextSize = 8
            copyBtn.BorderSizePixel = 0
            copyBtn.Parent = btn
            Instance.new("UICorner", copyBtn).CornerRadius = UDim.new(0, 3)

            btn.MouseEnter:Connect(function()
                btn.BackgroundColor3 = isFav and Color3.fromRGB(80, 50, 100) or Color3.fromRGB(60, 50, 120)
                btn.BackgroundTransparency = 0.1
            end)
            btn.MouseLeave:Connect(function()
                btn.BackgroundColor3 = isFav and Color3.fromRGB(60, 40, 80) or Color3.fromRGB(40, 40, 65)
                btn.BackgroundTransparency = 0.1
            end)

            btn.MouseButton1Click:Connect(function()
                currentIndex = i
                currentSong = s
                nowLabel.Text = "🎵 ".. s.title
                updateThumbnail(s)
                playSoundInternal(i)
                for _, child in pairs(scrollFrame:GetChildren()) do
                    if child:IsA("TextButton") and child ~= btn then
                        child.BackgroundColor3 = Color3.fromRGB(40, 40, 65)
                        child.BackgroundTransparency = 0.1
                    end
                end
                btn.BackgroundColor3 = Color3.fromRGB(80, 60, 180)
                btn.BackgroundTransparency = 0.1
            end)

            copyBtn.MouseButton1Click:Connect(function()
                if setclipboard then
                    pcall(function()
                        setclipboard(s.id)
                        copyBtn.Text = "✅"
                        copyBtn.BackgroundColor3 = Color3.fromRGB(0, 150, 0)
                        task.wait(0.4)
                        copyBtn.Text = "📋"
                        copyBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 80)
                    end)
                end
            end)
        end
    end

    -- ========================================
    -- EVENT
    -- ========================================
    playBtn.MouseButton1Click:Connect(togglePlay)
    nextBtn.MouseButton1Click:Connect(nextSong)
    prevBtn.MouseButton1Click:Connect(prevSong)

    UserInputService.InputBegan:Connect(function(input, gp)
        if gp then return end
        if input.KeyCode == Enum.KeyCode.Space then togglePlay() end
        if input.KeyCode == Enum.KeyCode.Right then nextSong() end
        if input.KeyCode == Enum.KeyCode.Left then prevSong() end
        if input.KeyCode == Enum.KeyCode.Escape then mainFrame.Visible = false end
    end)

    searchBox:GetPropertyChangedSignal("Text"):Connect(function()
        renderPlaylist(searchBox.Text)
    end)

    RunService.RenderStepped:Connect(function()
        updateWaveform()
        updateTimerAndProgress()
    end)

    -- ========================================
    -- LOGO 📦 (DENGAN SOUND COMPLETE 1x)
    -- ========================================
    local logoBtn = Instance.new("TextButton")
    logoBtn.Size = UDim2.new(0, 40, 0, 40)
    logoBtn.Position = UDim2.new(0, 12, 0, 100)
    logoBtn.BackgroundColor3 = Color3.fromRGB(180, 150, 255)
    logoBtn.Text = "📦"
    logoBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    logoBtn.TextSize = 20
    logoBtn.BorderSizePixel = 0
    logoBtn.Draggable = true
    logoBtn.Parent = screenGui
    Instance.new("UICorner", logoBtn).CornerRadius = UDim.new(0, 20)
    logoBtn.MouseButton1Click:Connect(function()
        mainFrame.Visible = not mainFrame.Visible
        
        -- PLAY COMPLETE SOUND 1x (HANYA SAAT LOGO DI KLIK PERTAMA KALI)
        if not isCompleteSoundPlayed then
            isCompleteSoundPlayed = true
            completeSound = playSound(COMPLETE_SOUND_ID, false, 500)
            task.delay(5, function()
                stopSound(completeSound)
            end)
        end
    end)

    -- INIT
    renderPlaylist("")
    nowLabel.Text = "🎵 ".. songs[1].title
    updateThumbnail(songs[1])
    updatePlayButton()
    updateTimerAndProgress()

    print("✅ PLAYLIST ULTIMATE v28 (FAVORIT + CUSTOM) - FIX META AI LOADED!")
    print("🎵 "..#songs.." lagu siap diputar!")
    print("⭐ Favorit: "..#userData.favorites.." lagu")
    print("📦 Custom: "..#userData.customSongs.." lagu")
end

loadAllSongs()